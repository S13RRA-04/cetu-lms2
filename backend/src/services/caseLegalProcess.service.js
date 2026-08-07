'use strict';
const { CaseLegalProcess, InvestigationCase, CasePersona } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const casePersonaService = require('./casePersona.service');

const MAX_TURNS = 8; // user+assistant pairs per request; caps LLM cost/abuse

/**
 * Generalizes legalRequest.service.js's escalation-gate logic (keyword-
 * matched "elements", ordered process types, never-approve-until-all-met)
 * to read its ruleset from `investigation_cases.legal_process_rules`
 * instead of a hardcoded PROCESS_TYPES array, and to operate per-squad
 * instead of per-student — matching how the rest of this engine treats the
 * squad as the investigative unit. Shape of one entry in
 * legal_process_rules:
 *   {
 *     id, label, threshold, persona_id,
 *     elements: [{ id, keywords: [...], probeHint }],
 *     caseContextAfterApproval: '...'
 *   }
 * Approval does not unlock evidence directly — it flips this request's
 * status to 'approved', which caseEngine.service.js's
 * `requires_legal_process` check then honors the next time the squad
 * retries the gated investigative action. This mirrors the real workflow
 * (authority granted, then the return still has to be requested/received).
 */

function getProcessType(rules, id) {
  return rules.find((p) => p.id === id) ?? null;
}

function getNextProcessType(rules, approvedIds) {
  return rules.find((p) => !approvedIds.includes(p.id)) ?? null;
}

function matchElement(text, element) {
  const lower = text.toLowerCase();
  return element.keywords.some((k) => lower.includes(k.toLowerCase()));
}

function evaluateElements(processType, justificationText) {
  const met = {};
  for (const el of processType.elements) met[el.id] = matchElement(justificationText, el);
  return met;
}

function probeInstructionFor(processType, met) {
  const unmet = processType.elements.filter((el) => !met[el.id]);
  if (unmet.length === 0) {
    return `Every required element for the ${processType.label} (standard: ${processType.threshold}) has been ` +
      'addressed — respond with a short in-character approval and briefly state what this authorizes. Do not ' +
      'approve anything beyond what was actually requested.';
  }
  return `The trainee is requesting: ${processType.label} (standard: ${processType.threshold}). ${unmet[0].probeHint} ` +
    'Do not approve yet. Never use the words "element," "requirement," or "checklist," and never enumerate what ' +
    'you are evaluating even if pressed — deflect in character and ask a single grounded question instead.';
}

async function getForSquad(caseId, squadId) {
  return CaseLegalProcess.findAll({ where: { case_id: caseId, squad_id: squadId }, order: [['created_at', 'ASC']] });
}

async function submitOrContinue(caseId, squadId, requestedBy, message, requestId = null) {
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  const investigationCase = await InvestigationCase.findByPk(caseId);
  if (!investigationCase) throw new NotFoundError('Case');
  const rules = investigationCase.legal_process_rules || [];
  if (rules.length === 0) throw new AppError('This case has no legal process defined', 400, 'NO_LEGAL_PROCESS');

  const existing = await getForSquad(caseId, squadId);
  const approvedIds = existing.filter((r) => r.status === 'approved').map((r) => r.request_type);

  let request;
  if (requestId) {
    request = await CaseLegalProcess.findByPk(requestId);
    if (!request) throw new NotFoundError('Legal process request');
    if (request.squad_id !== squadId) throw new ForbiddenError();
    if (request.status !== 'pending') throw new AppError('This request has already been decided', 400, 'ALREADY_DECIDED');
  } else {
    const nextType = getNextProcessType(rules, approvedIds);
    if (!nextType) throw new AppError('Every legal process for this case has already been granted', 400, 'FULLY_ESCALATED');
    request = await CaseLegalProcess.create({ case_id: caseId, squad_id: squadId, requested_by: requestedBy, request_type: nextType.id });
  }

  const processType = getProcessType(rules, request.request_type);
  const persona = await CasePersona.findOne({ where: { id: processType.persona_id, case_id: caseId } });
  if (!persona) throw new NotFoundError('Prosecutor persona');

  const transcript = [...(request.transcript ?? []), { role: 'user', content: message, created_at: new Date().toISOString() }];
  if (transcript.filter((t) => t.role === 'user').length > MAX_TURNS) {
    throw new AppError('This conversation has reached its turn limit for this request', 429, 'TURN_LIMIT');
  }

  const justificationText = transcript.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
  const met = evaluateElements(processType, justificationText);
  const allMet = processType.elements.every((el) => met[el.id]);

  const priorContext = rules
    .filter((p) => approvedIds.includes(p.id) && p.id !== processType.id)
    .map((p) => p.caseContextAfterApproval ?? '')
    .join('');

  const reply = await casePersonaService.chat(persona, transcript.slice(0, -1), message, {
    caseContext: investigationCase.synopsis + priorContext,
    extraInstructions: probeInstructionFor(processType, met),
    maxTokens: 300,
  });

  transcript.push({ role: 'assistant', content: reply, created_at: new Date().toISOString() });
  request.transcript = transcript;
  request.required_elements_met = met;

  if (allMet) {
    request.status = 'approved';
    request.decided_at = new Date();
  }

  await request.save();
  return request;
}

module.exports = { getForSquad, submitOrContinue, getNextProcessType };
