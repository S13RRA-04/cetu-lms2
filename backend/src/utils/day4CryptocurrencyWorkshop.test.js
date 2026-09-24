'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { STEPS, TRIAL_READINESS, SYNTHESIS, FRAMEWORK_CHECKS, buildQuestions } = require('../../scripts/lib/day4CryptocurrencyWorkshopSpec');

const questions = buildQuestions();

test('4 framework checks + 6 steps (each with its own checks + 1 prompt) + 1 trial-readiness prompt + 3 synthesis prompts', () => {
  assert.equal(FRAMEWORK_CHECKS.length, 4);
  assert.equal(STEPS.length, 6);
  for (const step of STEPS) {
    assert.ok(step.checks.length >= 1, step.name);
    assert.equal(step.prompt.kind, 'prompt', step.name);
  }
  assert.equal(TRIAL_READINESS.kind, 'prompt');
  assert.equal(SYNTHESIS.length, 3);
  // 4 + (1+1)+(2+1)+(3+1)+(1+1)+(1+1)+(2+1) + 1 + 3 = 4 + 16 + 1 + 3 = 24
  assert.equal(questions.length, 24);
});

test('every prompt has a non-empty rubric.keyElements list and positive points', () => {
  const prompts = questions.filter((q) => q.kind === 'prompt');
  assert.equal(prompts.length, 6 + 1 + 3, '6 step prompts + trial-readiness + 3 synthesis');
  for (const p of prompts) {
    assert.ok(p.text?.trim(), p.id);
    assert.ok(Array.isArray(p.rubric.keyElements) && p.rubric.keyElements.length > 0, p.text);
    assert.ok(p.points > 0, p.text);
    if (p.rubric.commonErrors) {
      assert.ok(p.rubric.commonErrors[0].startsWith('MODEL ANSWER (reference only'), p.text);
    }
  }
});

test('the trial-readiness prompt explicitly credits a squad for naming the un-established "who had access to the keys" gap rather than inventing an answer', () => {
  const text = TRIAL_READINESS.rubric.keyElements.join(' ');
  assert.match(text, /not established/i);
});

test('the squad synthesis prompts carry no commonErrors — open reflection, not a case with a model answer', () => {
  for (const p of SYNTHESIS) {
    assert.equal(p.rubric.commonErrors, undefined, p.text);
  }
});

test('every auto-graded check can actually be answered: 4 MC options with the key among them, or a non-empty accepted-answers list', () => {
  const checks = questions.filter((q) => q.kind !== 'prompt');
  assert.equal(checks.length, 14, '4 framework + steps\' own checks (1+2+3+1+1+2)');
  for (const q of checks) {
    const p = q.payload;
    if (p.kind === 'multiple_choice') {
      assert.equal(p.options.length, 4, q.stem);
      assert.ok(p.options.every((o) => o.text?.trim()), q.stem);
      assert.equal(p.correct.length, 1, q.stem);
      assert.ok(p.options.some((o) => o.id === p.correct[0]), q.stem);
    } else if (p.kind === 'fill_blank') {
      assert.ok(p.blanks[0].accepted.length > 0 && p.blanks[0].accepted.every((a) => a.trim()), q.stem);
    } else {
      assert.fail(`unsupported question kind ${p.kind}: ${q.stem}`);
    }
  }
});

test('ids are unique across the whole question set', () => {
  const ids = questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('total points match the sum of each item\'s own point value', () => {
  const total = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);
  // 14 checks * 10 = 140; step prompts 15+15+25+25+20+15 = 115; trial-readiness 25; synthesis 3*15 = 45
  assert.equal(total, 140 + 115 + 25 + 45);
  assert.equal(total, 325);
});
