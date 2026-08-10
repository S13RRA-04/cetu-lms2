'use strict';
const { SquadCaseState, CaseEvidence, CaseLegalProcess, CaseAction, Squad } = require('../models');

/**
 * Deterministic rules engine for the investigation simulation. This file
 * decides what an action *does* — no AI calls happen here, ever. The only
 * inputs that matter are real DB rows (squad_case_states, case_evidence,
 * case_legal_processes); nothing an AI model said is trusted as fact.
 *
 * Evidence unlocking is data-driven off `case_evidence.unlock_conditions`,
 * shaped as:
 *   {
 *     action_type: 'request_domain_registration',
 *     requires_entity_id: '<case_entities.id>' | null,
 *     requires_evidence_ids: ['<case_evidence.id>', ...],   // prior evidence prerequisite chain
 *     requires_legal_process: 'subpoena' | null,             // must have an approved CaseLegalProcess of this request_type
 *     requires_squad_victim_code: 'REDSTONE' | null,          // must match this squad's Squad.victim_code — for
 *                                                              // multi-victim cases (e.g. PACKET HEIST) where each
 *                                                              // squad is assigned one victim and shouldn't see
 *                                                              // another squad's victim-specific technical evidence.
 *                                                              // Evidence with no victim restriction (e.g. shared
 *                                                              // upstream-vendor/attribution evidence) is reachable
 *                                                              // by any squad regardless of their assigned victim.
 *   }
 * `{ always: true }` marks evidence that's part of the initial complaint —
 * visible to every squad the moment they open the case (still subject to
 * requires_squad_victim_code, if set), no action required.
 * This is the case-authoring surface (brief §29) — new investigative paths
 * are added by inserting case_evidence rows, not by editing this file.
 */

function prerequisitesMet(discoveredEvidenceIds, requiredIds) {
  if (!Array.isArray(requiredIds) || requiredIds.length === 0) return true;
  const have = new Set(discoveredEvidenceIds);
  return requiredIds.every((id) => have.has(id));
}

/**
 * Pure decision core — no DB, no async — so it's directly unit-testable.
 * `approvedProcessTypes` is a Set<string> of this squad's already-approved
 * case_legal_processes.request_type values, computed once by the caller.
 */
function resolveOutcome({ candidates, actionType, targetEntityId, discoveredEvidenceIds, approvedProcessTypes, squadVictimCode = null }) {
  const matching = candidates.filter((ev) => {
    const cond = ev.unlock_conditions || {};
    if (cond.action_type !== actionType) return false;
    if (cond.requires_entity_id && cond.requires_entity_id !== targetEntityId) return false;
    return true;
  });

  const alreadyUnlocked = matching.filter((ev) => discoveredEvidenceIds.includes(ev.id));
  const newlyEligible = [];
  const blocked = [];

  for (const ev of matching) {
    if (discoveredEvidenceIds.includes(ev.id)) continue;
    const cond = ev.unlock_conditions || {};
    const prereqOk = prerequisitesMet(discoveredEvidenceIds, cond.requires_evidence_ids);
    const legalOk = !cond.requires_legal_process || approvedProcessTypes.has(cond.requires_legal_process);
    const victimOk = !cond.requires_squad_victim_code || cond.requires_squad_victim_code === squadVictimCode;
    if (prereqOk && legalOk && victimOk) newlyEligible.push(ev);
    else blocked.push({ evidence: ev, prereqOk, legalOk, victimOk, requiresLegalProcess: cond.requires_legal_process });
  }

  let status = 'completed';
  let narrative;

  if (newlyEligible.length > 0) {
    narrative = `New evidence obtained: ${newlyEligible.map((e) => e.evidence_key).join(', ')}.`;
  } else if (alreadyUnlocked.length > 0 && matching.length === alreadyUnlocked.length) {
    narrative = 'This has already been requested — nothing new resulted.';
  } else if (blocked.length > 0) {
    status = 'denied';
    const victimReason = blocked.find((b) => !b.victimOk);
    const legalReason = blocked.find((b) => !b.legalOk);
    narrative = victimReason
      ? 'That is outside the scope of your squad\'s assigned matter.'
      : legalReason
        ? `You do not currently have the legal authority (${legalReason.requiresLegalProcess}) required for this request.`
        : 'You do not currently have sufficient information to pursue this request yet.';
  } else {
    status = 'denied';
    narrative = 'That request does not lead anywhere in this investigation — reconsider the target or approach.';
  }

  return { status, narrative, newlyEligible, alreadyUnlocked, blocked };
}

async function getSquadVictimCode(squadId) {
  const squad = await Squad.findByPk(squadId, { attributes: ['victim_code'] });
  return squad?.victim_code ?? null;
}

/** New squad case states start seeded with whatever evidence/entities the intake complaint already discloses, scoped to this squad's assigned victim if the case has victim-scoped evidence. */
async function getOrCreateSquadCaseState(caseId, squadId) {
  const [state, created] = await SquadCaseState.findOrCreate({
    where: { case_id: caseId, squad_id: squadId },
    defaults: { case_id: caseId, squad_id: squadId },
  });
  if (!created) return state;

  const [intakeEvidence, squadVictimCode] = await Promise.all([
    CaseEvidence.findAll({ where: { case_id: caseId } }),
    getSquadVictimCode(squadId),
  ]);
  const alwaysVisible = intakeEvidence.filter((ev) => {
    const cond = ev.unlock_conditions || {};
    if (cond.always !== true) return false;
    if (cond.requires_squad_victim_code && cond.requires_squad_victim_code !== squadVictimCode) return false;
    return true;
  });
  if (alwaysVisible.length === 0) return state;

  const entityIds = new Set();
  for (const ev of alwaysVisible) for (const eid of ev.related_entity_ids || []) entityIds.add(eid);

  await state.update({
    discovered_evidence_ids: alwaysVisible.map((ev) => ev.id),
    discovered_entity_ids: Array.from(entityIds),
  });
  return state;
}

async function getApprovedProcessTypes(caseId, squadId) {
  const rows = await CaseLegalProcess.findAll({ where: { case_id: caseId, squad_id: squadId, status: 'approved' }, attributes: ['request_type'] });
  return new Set(rows.map((r) => r.request_type));
}

/**
 * Resolves one submitted investigative action against case truth, updates
 * squad progress, and logs a CaseAction row (the audit trail / reasoning
 * journal / inject log all read from this same table).
 */
async function evaluateAction({ caseId, squadId, actionType, targetEntityId = null, studentId = null, role = null, justificationText = null, extractedIntent = null, isInject = false }) {
  const state = await getOrCreateSquadCaseState(caseId, squadId);
  const [candidates, approvedProcessTypes, squadVictimCode] = await Promise.all([
    CaseEvidence.findAll({ where: { case_id: caseId } }),
    getApprovedProcessTypes(caseId, squadId),
    getSquadVictimCode(squadId),
  ]);

  const discoveredEvidenceIds = [...(state.discovered_evidence_ids || [])];
  const { status, narrative, newlyEligible } = resolveOutcome({
    candidates, actionType, targetEntityId, discoveredEvidenceIds, approvedProcessTypes, squadVictimCode,
  });

  const unlockedEntityIds = new Set(state.discovered_entity_ids || []);
  for (const ev of newlyEligible) {
    discoveredEvidenceIds.push(ev.id);
    for (const eid of ev.related_entity_ids || []) unlockedEntityIds.add(eid);
  }
  if (targetEntityId) unlockedEntityIds.add(targetEntityId);

  await state.update({
    discovered_evidence_ids: discoveredEvidenceIds,
    discovered_entity_ids: Array.from(unlockedEntityIds),
    updated_by: studentId,
  });

  const action = await CaseAction.create({
    case_id: caseId,
    squad_id: squadId,
    student_id: studentId,
    role,
    action_type: actionType,
    target_entity_id: targetEntityId,
    justification_text: justificationText,
    extracted_intent: extractedIntent,
    status,
    result: { narrative, unlocked_evidence_ids: newlyEligible.map((e) => e.id) },
    is_inject: isInject,
  });

  return { action, state, unlockedEvidence: newlyEligible, narrative, status };
}

async function getState(caseId, squadId) {
  return getOrCreateSquadCaseState(caseId, squadId);
}

async function listActions(caseId, squadId) {
  return CaseAction.findAll({ where: { case_id: caseId, squad_id: squadId }, order: [['created_at', 'ASC']] });
}

module.exports = { evaluateAction, getState, listActions, getOrCreateSquadCaseState, resolveOutcome, prerequisitesMet };
