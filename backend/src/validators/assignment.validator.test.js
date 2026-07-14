'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeSchema } = require('./assignment.validator');

test('grade schema accepts legacy numeric prompt scores', () => {
  const { error } = gradeSchema.validate({ score: 5, promptScores: { 0: 5 } });
  assert.equal(error, undefined);
});

test('grade schema accepts checked rubric criteria with derived score', () => {
  const { error } = gradeSchema.validate({
    score: 7.5,
    promptScores: { 0: { score: 7.5, maxScore: 10, criteria: [true, true, true, false] } },
  });
  assert.equal(error, undefined);
});

test('grade schema rejects malformed criterion selections', () => {
  const { error } = gradeSchema.validate({
    score: 5,
    promptScores: { 0: { score: 5, maxScore: 10, criteria: [true, 'yes'] } },
  });
  assert.ok(error);
});

test('grade schema rejects a score that does not match checked criteria', () => {
  const { error } = gradeSchema.validate({
    score: 10,
    promptScores: { 0: { score: 10, maxScore: 10, criteria: [true, false] } },
  });
  assert.ok(error);
});
