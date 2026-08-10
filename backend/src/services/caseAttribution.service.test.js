'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeGaps, DIMENSIONS } = require('./caseAttribution.service');

test('summarizeGaps treats every dimension as unassessed when nothing is rated', () => {
  const gaps = summarizeGaps({});
  assert.equal(gaps.unassessed.length, DIMENSIONS.length);
  assert.equal(gaps.readiness, 'insufficient');
});

test('summarizeGaps treats a rated dimension with no cited evidence as weak, not corroborated', () => {
  const gaps = summarizeGaps({ technical: { rating: 'strong', supporting_evidence_ids: [], notes: 'looks solid' } });
  assert.ok(gaps.weak.includes('technical'), 'an uncited rating must never count as corroborated');
  assert.ok(!gaps.corroborated.includes('technical'));
});

test('summarizeGaps counts a rated-and-cited dimension as corroborated', () => {
  const gaps = summarizeGaps({ technical: { rating: 'strong', supporting_evidence_ids: ['ev1'], notes: '' } });
  assert.ok(gaps.corroborated.includes('technical'));
});

test('summarizeGaps never produces a single numeric confidence score', () => {
  const gaps = summarizeGaps({ technical: { rating: 'strong', supporting_evidence_ids: ['ev1'] } });
  assert.equal(typeof gaps.readiness, 'string');
  assert.ok(!('confidence' in gaps) && !('score' in gaps) && !('percentage' in gaps));
});

test('summarizeGaps reaches "substantial" only once nearly every dimension is corroborated', () => {
  const dims = {};
  for (const key of DIMENSIONS) dims[key] = { rating: 'moderate', supporting_evidence_ids: ['ev1'] };
  const gaps = summarizeGaps(dims);
  assert.equal(gaps.readiness, 'substantial');
});

test('summarizeGaps reaches "developing" with partial corroboration', () => {
  const dims = {};
  for (const key of DIMENSIONS.slice(0, 3)) dims[key] = { rating: 'moderate', supporting_evidence_ids: ['ev1'] };
  const gaps = summarizeGaps(dims);
  assert.equal(gaps.readiness, 'developing');
});
