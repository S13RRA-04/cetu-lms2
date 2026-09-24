'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, FINAL_STATEMENTS, SYNTHESIS, FRAMEWORK_CHECKS, buildQuestions } = require('../../scripts/lib/day4AttributionWorkshopSpec');

const questions = buildQuestions();

test('exactly 4 framework checks + (3 checks + 1 prompt) per category + 3 final statements + 3 synthesis prompts', () => {
  assert.equal(FRAMEWORK_CHECKS.length, 4);
  assert.equal(CATEGORIES.length, 5);
  for (const category of CATEGORIES) {
    assert.equal(category.checks.length, 3, category.name);
    assert.equal(category.prompt.kind, 'prompt', category.name);
  }
  assert.equal(FINAL_STATEMENTS.length, 3);
  assert.equal(SYNTHESIS.length, 3);
  // 4 + 5*(3+1) + 3 + 3 = 30
  assert.equal(questions.length, 30);
});

test('every prompt has a non-empty rubric.keyElements list, and instructor-only commonErrors (when present) is clearly marked reference-only', () => {
  const prompts = questions.filter((q) => q.kind === 'prompt');
  assert.equal(prompts.length, 11, '5 category statements + 3 final statements + 3 synthesis');
  for (const p of prompts) {
    assert.ok(p.text?.trim(), p.id);
    assert.ok(Array.isArray(p.rubric.keyElements) && p.rubric.keyElements.length > 0, p.text);
    assert.ok(p.points > 0, p.text);
    if (p.rubric.commonErrors) {
      assert.ok(p.rubric.commonErrors[0].startsWith('MODEL ANSWER (reference only'), p.text);
    }
  }
});

test('the squad synthesis prompts carry no commonErrors — they are open reflection, not a case with a model answer', () => {
  for (const p of SYNTHESIS) {
    assert.equal(p.rubric.commonErrors, undefined, p.text);
  }
});

test('every auto-graded check can actually be answered: 4 options with the key among them, or a non-empty accepted-answers list', () => {
  const checks = questions.filter((q) => q.kind !== 'prompt');
  assert.equal(checks.length, 19, '4 framework + 5 categories * 3');
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

test('titles/ids are unique across the whole question set', () => {
  const ids = questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('total points match the sum of each item\'s own point value (no drift between spec and max_score derivation)', () => {
  const total = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);
  // 4*10 (framework) + 5*(3*10 + 25) (categories) + 3*20 (final) + 3*15 (synthesis)
  assert.equal(total, 40 + 5 * 55 + 60 + 45);
  assert.equal(total, 420);
});
