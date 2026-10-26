'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TACTIC_SORTS, TECHNIQUES, JUDGMENT, buildQuestions } = require('../../scripts/lib/day1AttckWorkshopSpec');
const { isAnswerCorrect, gradeQuizAnswers, isFullyAutoGradable } = require('./quizGrading');

const questions = buildQuestions();

// The raw answer a squad would submit if it got every item right — built
// from each item's own key, then run through the real server-side grader.
function perfectRaw(q) {
  const p = q.payload;
  if (p.kind === 'multiple_choice') return p.correct;
  if (p.kind === 'true_false') return p.correct;
  if (p.kind === 'fill_blank') return p.blanks[0].accepted[0];
  if (p.kind === 'drag_match') return Object.fromEntries(p.matches.map((m) => [m.sourceId, m.targetId]));
  throw new Error(`unexpected kind ${p.kind}`);
}

test('2 tactic sorts + 18 technique items + 4 judgment items', () => {
  assert.equal(TACTIC_SORTS.length, 2);
  assert.equal(TECHNIQUES.length, 18);
  assert.equal(JUDGMENT.length, 4);
  assert.equal(questions.length, 24);
});

test('fully auto-gradable, so AssignmentPage routes it to QuizFlow (no prompt items)', () => {
  assert.ok(isFullyAutoGradable(questions));
  assert.ok(questions.every((q) => q.kind !== 'prompt'));
});

test('a perfect answer set grades to max_score through the server grader', () => {
  const answers = questions.map((q) => ({ questionId: q.id, raw: perfectRaw(q) }));
  const { totalScore, maxScore } = gradeQuizAnswers(questions, answers);
  assert.equal(maxScore, 2 * 20 + 14 * 10 + 4 * 10 + 4 * 10);
  assert.equal(totalScore, maxScore);
});

test('every item has a stem, an explanation, and an INTEL BRIEF hint that does not give away a technique ID answer', () => {
  for (const q of questions) {
    assert.ok(q.stem?.trim(), q.id);
    assert.ok(q.feedback.correct?.trim() && q.feedback.incorrect?.trim(), q.stem);
    assert.ok(q.feedback.reference?.trim(), q.stem);
    if (q.payload.kind === 'fill_blank') {
      for (const accepted of q.payload.blanks[0].accepted) {
        assert.ok(!q.feedback.reference.includes(accepted), q.stem);
      }
    }
  }
});

test('multiple choice: 4 distinct options, one key, and wrong options actually grade wrong', () => {
  for (const q of questions.filter((x) => x.payload.kind === 'multiple_choice')) {
    const { options, correct } = q.payload;
    assert.equal(options.length, 4, q.stem);
    assert.equal(new Set(options.map((o) => o.text)).size, 4, q.stem);
    assert.equal(correct.length, 1, q.stem);
    for (const o of options.filter((x) => x.id !== correct[0])) {
      assert.equal(isAnswerCorrect(q, [o.id]), false, `${q.stem} / ${o.text}`);
    }
  }
});

test('technique-ID blanks accept the ID with or without the T, in any case', () => {
  for (const q of questions.filter((x) => x.payload.kind === 'fill_blank')) {
    const id = q.payload.blanks[0].accepted[0];
    assert.match(id, /^T\d{4}(\.\d{3})?$/, q.stem);
    for (const raw of [id, id.toLowerCase(), id.slice(1), ` ${id} `]) {
      assert.ok(isAnswerCorrect(q, raw), `${q.stem} / "${raw}"`);
    }
  }
});

test('tactic sorts are one-to-one with distinct tactics, and a single swap grades wrong', () => {
  for (const q of TACTIC_SORTS) {
    const { sources, targets, matches } = q.payload;
    assert.equal(sources.length, targets.length);
    assert.equal(matches.length, sources.length);
    assert.equal(new Set(targets.map((t) => t.text)).size, targets.length);
    const raw = perfectRaw(q);
    [raw.src_1, raw.src_2] = [raw.src_2, raw.src_1];
    assert.equal(isAnswerCorrect(q, raw), false);
  }
});

test('ids are unique across the whole question set', () => {
  const ids = questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});
