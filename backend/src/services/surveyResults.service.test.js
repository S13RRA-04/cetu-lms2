'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MIN_ANONYMOUS_RESPONSES, shouldSuppressAnonymousResults, aggregateSurveyResults, groupRecommendations, parseResponses } = require('./surveyResults.service');
const questions = [
  { id: 'q1', type: 'single', section: 'Course Content', prompt: 'Relevant?', options: [{ label: 'Agree', value: 'Agree' }, { label: 'Neutral', value: 'Neutral' }] },
  { id: 'q9', type: 'text', section: 'Course Content', prompt: 'Most valuable?' },
  { id: 'q29', type: 'single', section: 'Evidence Drop & Investigation Format', prompt: 'Format?', options: [{ label: 'Agree', value: 'Agree' }, { label: 'Neutral', value: 'Neutral' }] },
  { id: 'q35', type: 'text', section: 'Evidence Drop & Investigation Format', prompt: 'Changes?' },
];
test('aggregates every anonymous survey category, rating, and open response', () => {
  const result = aggregateSurveyResults(questions, [
    { q1: 'Agree', q9: 'Practical work.', q29: 'Agree', q35: 'More investigation time.' },
    { q1: 'Neutral', q29: 'Agree' },
    { q1: 'Agree', q29: 'Neutral' },
  ]);
  assert.equal(result.response_count, 3);
  assert.deepEqual(result.sections.map(({ title }) => title), ['Course Content', 'Evidence Drop & Investigation Format']);
  assert.deepEqual(result.sections[0].distributions[0].options.map(({ count, percent }) => [count, percent]), [[2, 67], [1, 33]]);
  assert.deepEqual(result.sections[0].text_responses[0].responses, ['Practical work.']);
  assert.equal(result.recommendation_groups[0].key, 'investigation_time');
  assert.equal(Object.hasOwn(result, 'user_id'), false);
});
test('groups comments into multiple auditable themes', () => { const groups = groupRecommendations(['More squad collaboration time and a shorter briefing.', 'Something entirely different.']); assert.ok(groups.find(({ key }) => key === 'collaboration')); assert.ok(groups.find(({ key }) => key === 'briefing_guidance')); assert.ok(groups.find(({ key }) => key === 'other')); assert.equal(parseResponses('{bad'), null); });
test('anonymous survey reporting requires at least three responses', () => {
  assert.equal(MIN_ANONYMOUS_RESPONSES, 3);
  assert.equal(shouldSuppressAnonymousResults(0), true);
  assert.equal(shouldSuppressAnonymousResults(2), true);
  assert.equal(shouldSuppressAnonymousResults(3), false);
});
