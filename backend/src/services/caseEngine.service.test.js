'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveOutcome, prerequisitesMet } = require('./caseEngine.service');

function evidence(id, overrides = {}) {
  return { id, evidence_key: id, related_entity_ids: [], unlock_conditions: {}, ...overrides };
}

test('prerequisitesMet is vacuously true with no requirements', () => {
  assert.equal(prerequisitesMet([], undefined), true);
  assert.equal(prerequisitesMet([], []), true);
});

test('prerequisitesMet requires every id to already be discovered', () => {
  assert.equal(prerequisitesMet(['a', 'b'], ['a']), true);
  assert.equal(prerequisitesMet(['a'], ['a', 'b']), false);
});

test('resolveOutcome unlocks evidence matching action_type and target entity', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: 'domain1' } }),
    evidence('ev2', { unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: 'domain2' } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'conduct_osint', targetEntityId: 'domain1',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(),
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.newlyEligible.map((e) => e.id), ['ev1']);
});

test('resolveOutcome denies a request gated behind an unapproved legal process', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: 'acct1', requires_legal_process: 'subpoena' } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'request_financial_records', targetEntityId: 'acct1',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(),
  });
  assert.equal(result.status, 'denied');
  assert.match(result.narrative, /legal authority \(subpoena\)/);
});

test('resolveOutcome unlocks the same request once the legal process is approved', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: 'acct1', requires_legal_process: 'subpoena' } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'request_financial_records', targetEntityId: 'acct1',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(['subpoena']),
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.newlyEligible.map((e) => e.id), ['ev1']);
});

test('resolveOutcome denies a request that is gated behind unmet evidence prerequisites', () => {
  const candidates = [
    evidence('ev2', { unlock_conditions: { action_type: 'request_financial_records', requires_entity_id: 'acct1', requires_evidence_ids: ['ev1'] } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'request_financial_records', targetEntityId: 'acct1',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(),
  });
  assert.equal(result.status, 'denied');
});

test('resolveOutcome reports nothing new when everything matching is already discovered', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: 'domain1' } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'conduct_osint', targetEntityId: 'domain1',
    discoveredEvidenceIds: ['ev1'], approvedProcessTypes: new Set(),
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.newlyEligible.length, 0);
  assert.match(result.narrative, /already been requested/);
});

test('resolveOutcome unlocks victim-scoped evidence only for the squad assigned that victim', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'request_intrusion_telemetry', requires_entity_id: 'redstone', requires_squad_victim_code: 'REDSTONE' } }),
  ];
  const forAssignedSquad = resolveOutcome({
    candidates, actionType: 'request_intrusion_telemetry', targetEntityId: 'redstone',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(), squadVictimCode: 'REDSTONE',
  });
  assert.equal(forAssignedSquad.status, 'completed');
  assert.deepEqual(forAssignedSquad.newlyEligible.map((e) => e.id), ['ev1']);

  const forOtherSquad = resolveOutcome({
    candidates, actionType: 'request_intrusion_telemetry', targetEntityId: 'redstone',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(), squadVictimCode: 'DOGWOOD',
  });
  assert.equal(forOtherSquad.status, 'denied');
  assert.match(forOtherSquad.narrative, /outside the scope of your squad/);
});

test('resolveOutcome unlocks victim-unscoped evidence for any squad regardless of assigned victim', () => {
  const candidates = [
    evidence('ev1', { unlock_conditions: { action_type: 'conduct_osint', requires_entity_id: 'restonit' } }),
  ];
  const result = resolveOutcome({
    candidates, actionType: 'conduct_osint', targetEntityId: 'restonit',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(), squadVictimCode: 'PIXELPLAY',
  });
  assert.equal(result.status, 'completed');
});

test('resolveOutcome denies an action_type/target pairing that leads nowhere in this case', () => {
  const result = resolveOutcome({
    candidates: [], actionType: 'interview_persona', targetEntityId: 'nonexistent',
    discoveredEvidenceIds: [], approvedProcessTypes: new Set(),
  });
  assert.equal(result.status, 'denied');
  assert.match(result.narrative, /does not lead anywhere/);
});
