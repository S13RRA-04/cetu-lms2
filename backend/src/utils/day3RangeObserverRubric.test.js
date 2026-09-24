'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CRITERIA, BANDS, buildQuestions } = require('../../scripts/lib/day3RangeObserverRubricSpec');

const questions = buildQuestions();

test('13 criteria, each with 4 score bands (0-3)', () => {
  assert.equal(CRITERIA.length, 13);
  assert.equal(questions.length, 13);
  assert.equal(BANDS.length, 4);
  assert.deepEqual(BANDS.map((b) => b.score), [0, 1, 2, 3]);
});

test('criterion numbers are 1-13 with no gaps or duplicates', () => {
  const numbers = CRITERIA.map((c) => c.number).sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 13 }, (_, i) => i + 1));
});

test('exactly the three weighted criteria named in the briefing carry a weight above 1.0', () => {
  const weighted = CRITERIA.filter((c) => c.weight !== 1.0);
  const byTitle = Object.fromEntries(weighted.map((c) => [c.title, c.weight]));
  assert.deepEqual(byTitle, {
    'Real-time decision-making':  1.5,
    'Cross-venue coordination':   1.5,
    'Adaptive scope reasoning':   1.3,
  });
  assert.equal(CRITERIA.length - weighted.length, 10, 'the other 10 criteria stay at the default x1.0');
});

test('every question carries a non-empty title/text, its own weight, and points = 3 x weight', () => {
  for (const q of questions) {
    assert.ok(q.title?.trim(), q.id);
    assert.ok(q.text?.trim(), q.id);
    assert.equal(q.kind, 'rubric_criterion', q.id);
    assert.equal(q.points, Number((3 * q.weight).toFixed(2)), q.id);
    assert.equal(q.bands.length, 4, q.id);
  }
});

test('ids are unique and ordered 1-13', () => {
  const ids = questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(questions.map((q) => q.number), Array.from({ length: 13 }, (_, i) => i + 1));
});

test('weighted maximum is 42.9 — the real number this spec\'s own weights produce, not the briefing\'s unreconciled "84"', () => {
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  assert.equal(Number(total.toFixed(2)), 42.9);
});
