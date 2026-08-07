'use strict';
const { CaseEntity, CaseEvidence } = require('../models');
const aiProvider = require('./ai/aiProvider');
const caseEngine = require('./caseEngine.service');

/**
 * Natural-language → structured action (design brief §10). The model only
 * ever proposes an action_type + a target entity NAME — this file resolves
 * that name against real case_entities rows before anything is executed.
 * If the model names an entity that doesn't exist in this case, the target
 * is dropped rather than trusted; caseEngine.service.js then decides what
 * actually happens, deterministically.
 */

async function knownActionTypes(caseId) {
  const evidence = await CaseEvidence.findAll({ where: { case_id: caseId }, attributes: ['unlock_conditions'] });
  const types = new Set(['create_hypothesis', 'request_legal_process', 'interview_persona']);
  for (const ev of evidence) {
    const t = ev.unlock_conditions?.action_type;
    if (t) types.add(t);
  }
  return Array.from(types);
}

function buildSystemPrompt(actionTypes, entities) {
  const entityList = entities.map((e) => `- ${e.name} (${e.type})`).join('\n');
  return (
    'You translate a trainee investigator\'s free-text request into a single JSON object describing the ' +
    'investigative action they want to take. Respond with ONLY a JSON object, no prose, matching exactly:\n' +
    '{"action_type": "<one of the allowed action types below, or null>", "target_entity_name": "<the exact ' +
    'name of an entity from the list below the request refers to, or null>"}\n\n' +
    `Allowed action types:\n${actionTypes.map((t) => `- ${t}`).join('\n')}\n\n` +
    `Known entities in this case (only ever name one of these, verbatim — never invent a name):\n${entityList || '(none discovered yet)'}\n\n` +
    'If the request does not clearly match an allowed action type, or names no entity from the list, use null ' +
    'for that field rather than guessing.'
  );
}

/**
 * Pure validation core — no AI call, no DB — so the "never trust a
 * model-invented entity" guarantee is directly unit-testable. Given the
 * model's raw parsed output plus the REAL action types and entities that
 * exist for this case, returns only what's actually verifiable; anything
 * the model named that doesn't match a real row is dropped, never trusted.
 */
function resolveIntent(parsed, actionTypes, entities) {
  if (!parsed || typeof parsed !== 'object') {
    return { actionType: null, targetEntityId: null, extractedIntent: parsed };
  }

  const actionType = actionTypes.includes(parsed.action_type) ? parsed.action_type : null;

  let targetEntityId = null;
  if (parsed.target_entity_name) {
    const nameLower = String(parsed.target_entity_name).toLowerCase();
    const match = entities.find((e) => {
      if (e.name.toLowerCase() === nameLower) return true;
      return (e.aliases || []).some((a) => String(a).toLowerCase() === nameLower);
    });
    if (match) targetEntityId = match.id;
  }

  return { actionType, targetEntityId, extractedIntent: parsed };
}

/**
 * @returns {{ actionType: string|null, targetEntityId: string|null, extractedIntent: object|null }}
 */
async function interpret(caseId, freeText) {
  const [actionTypes, entities] = await Promise.all([
    knownActionTypes(caseId),
    CaseEntity.findAll({ where: { case_id: caseId } }),
  ]);

  const systemPrompt = buildSystemPrompt(actionTypes, entities);
  const parsed = await aiProvider.classifyIntent(systemPrompt, freeText, { maxTokens: 300 });

  return resolveIntent(parsed, actionTypes, entities);
}

/** Interprets free text and immediately resolves it through the deterministic engine. */
async function interpretAndEvaluate({ caseId, squadId, freeText, studentId, role }) {
  const { actionType, targetEntityId, extractedIntent } = await interpret(caseId, freeText);

  if (!actionType) {
    return {
      action: null,
      narrative: 'Could not determine a specific investigative action from that request — try naming a concrete ' +
        'action (e.g. "request subpoena for...", "interview...") and a specific person, account, or system.',
      status: 'denied',
    };
  }

  return caseEngine.evaluateAction({
    caseId, squadId, actionType, targetEntityId, studentId, role,
    justificationText: freeText, extractedIntent,
  });
}

module.exports = { interpret, interpretAndEvaluate, knownActionTypes, resolveIntent };
