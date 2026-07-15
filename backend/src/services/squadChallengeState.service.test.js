'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeManualState } = require('./squadChallengeState.service');

test('manual squad state merges separate prompt fields without clobbering work', () => {
  const first = mergeManualState({}, { manual: { answers: { 0: 'Timeline draft' }, typing: { 0: true } } }, { id: 'u1', first_name: 'Alex', last_name: 'One' });
  const second = mergeManualState(first, { manual: { answers: { 1: 'Legal process draft' }, typing: { 1: true } } }, { id: 'u2', first_name: 'Sam', last_name: 'Two' });
  assert.equal(second.manual.answers[0], 'Timeline draft');
  assert.equal(second.manual.answers[1], 'Legal process draft');
  assert.equal(second.manual.typing[0].name, 'Alex One');
  assert.equal(second.manual.typing[1].name, 'Sam Two');
  assert.equal(second.manual.field_meta[0].name, 'Alex One');
  assert.equal(second.manual.field_meta[1].name, 'Sam Two');
});

test('manual squad state removes expired typing presence', () => {
  const result = mergeManualState({ manual: { answers: {}, typing: { 0: { user_id: 'u1', name: 'Alex', expires_at: 1 } } } }, { manual: {} }, { id: 'u2', first_name: 'Sam', last_name: 'Two' });
  assert.deepEqual(result.manual.typing, {});
});
