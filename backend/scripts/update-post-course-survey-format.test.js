'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FORMAT_QUESTION_IDS, formatQuestions, mergeFormatQuestions } = require('./update-post-course-survey-format');

test('format survey update preserves existing questions and inserts before application feedback', () => {
  const merged = mergeFormatQuestions([
    { id: 'q1', section: 'Course Content' },
    { id: 'q22', section: 'Application Experience' },
  ]);
  assert.equal(merged[0].id, 'q1');
  assert.equal(merged.at(-1).id, 'q22');
  assert.deepEqual(merged.slice(1, -1).map(({ id }) => id), FORMAT_QUESTION_IDS);
});

test('format survey update is idempotent and includes structured and open feedback', () => {
  const once = mergeFormatQuestions([{ id: 'q1' }, ...formatQuestions]);
  const twice = mergeFormatQuestions(once);
  assert.deepEqual(twice, once);
  assert.ok(formatQuestions.some((question) => question.id === 'q34' && question.options.length >= 5));
  assert.equal(formatQuestions.find((question) => question.id === 'q35').type, 'text');
});
