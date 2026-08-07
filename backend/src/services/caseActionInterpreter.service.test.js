'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveIntent } = require('./caseActionInterpreter.service');

const ACTION_TYPES = ['conduct_osint', 'request_financial_records'];
const ENTITIES = [
  { id: 'e1', name: 'Marcus Delaney', aliases: ['M. Delaney'] },
  { id: 'e2', name: 'Ridgeline Community Bank ****4471', aliases: [] },
];

test('resolveIntent accepts a real action type and resolves a real entity by exact name', () => {
  const result = resolveIntent({ action_type: 'conduct_osint', target_entity_name: 'Marcus Delaney' }, ACTION_TYPES, ENTITIES);
  assert.equal(result.actionType, 'conduct_osint');
  assert.equal(result.targetEntityId, 'e1');
});

test('resolveIntent resolves an entity by alias, case-insensitively', () => {
  const result = resolveIntent({ action_type: 'conduct_osint', target_entity_name: 'm. delaney' }, ACTION_TYPES, ENTITIES);
  assert.equal(result.targetEntityId, 'e1');
});

test('resolveIntent drops an action_type the model invented that is not in this case\'s real set', () => {
  const result = resolveIntent({ action_type: 'execute_search_warrant', target_entity_name: 'Marcus Delaney' }, ACTION_TYPES, ENTITIES);
  assert.equal(result.actionType, null, 'a plausible-looking but unlisted action type must never be trusted');
});

test('resolveIntent drops a hallucinated entity name with no matching real row', () => {
  const result = resolveIntent({ action_type: 'conduct_osint', target_entity_name: 'Someone The Model Invented' }, ACTION_TYPES, ENTITIES);
  assert.equal(result.actionType, 'conduct_osint');
  assert.equal(result.targetEntityId, null, 'an entity name with no real match must never be resolved to any id');
});

test('resolveIntent handles a non-object / unparseable model response without throwing', () => {
  const result = resolveIntent(null, ACTION_TYPES, ENTITIES);
  assert.equal(result.actionType, null);
  assert.equal(result.targetEntityId, null);
});
