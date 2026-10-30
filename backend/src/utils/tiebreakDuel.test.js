'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('./tiebreakDuel');
const { LIGHTNING_BANK, ROUNDS } = require('../constants/lightningDuelBank');

const entry = (userId, performancePercent, rankingEligible = true) => ({ userId, performancePercent, rankingEligible });

// A duel whose rounds 1..n are all closed, with each duelist's points per round.
function playedDuel(pointsByRound, extra = {}) {
  const answers = {};
  pointsByRound.forEach((points, i) => {
    answers[String(i + 1)] = Object.fromEntries(Object.entries(points).map(([id, p]) => [id, { choice: 'a', correct: p > 0, points: p }]));
  });
  return {
    participant_ids: Object.keys(pointsByRound[0]),
    round: pointsByRound.length,
    round_started_at: new Date(0),
    answers,
    practice: false,
    ...extra,
  };
}

test('tiebreak: a tie means two or more ranking-eligible students sharing the top percentage', () => {
  assert.deepEqual(rules.findLeaderTie([entry('a', 91.5), entry('b', 91.5), entry('c', 80)]).map((e) => e.userId), ['a', 'b']);
  assert.deepEqual(rules.findLeaderTie([entry('a', 91.5), entry('b', 91.4)]), []);
  // An ineligible student at the same percentage isn't in the race for first.
  assert.deepEqual(rules.findLeaderTie([entry('a', 91.5), entry('b', 80), entry('x', 91.5, false)]), []);
});

test('tiebreak: every bank question has four distinct options and a unique id', () => {
  assert.ok(LIGHTNING_BANK.length >= ROUNDS * 3, 'enough questions for regulation plus sudden death');
  assert.equal(new Set(LIGHTNING_BANK.map((q) => q.id)).size, LIGHTNING_BANK.length);
  for (const q of LIGHTNING_BANK) {
    assert.equal(q.options.length, 4, q.id);
    assert.equal(new Set(q.options).size, 4, q.id);
  }
});

test('tiebreak: drawing keeps each question\'s correct answer through the shuffle', () => {
  const drawn = rules.drawQuestions(LIGHTNING_BANK);
  assert.equal(drawn.length, LIGHTNING_BANK.length);
  for (const q of drawn) {
    const source = LIGHTNING_BANK.find((b) => b.id === q.id);
    assert.equal(q.options.find((o) => o.id === q.correct).text, source.options[0]);
  }
});

test('tiebreak: a correct answer earns 100 plus a speed bonus; a wrong one earns nothing', () => {
  assert.equal(rules.roundPoints(true, 0), 150);
  assert.equal(rules.roundPoints(true, rules.ROUND_MS / 2), 125);
  assert.equal(rules.roundPoints(true, rules.ROUND_MS + 500), 100);
  assert.equal(rules.roundPoints(false, 0), 0);
});

test('tiebreak: a round closes when both duelists answer or the clock runs out', () => {
  const start = 1_000_000;
  const duel = { participant_ids: ['a', 'b'], round: 1, round_started_at: new Date(start), answers: { 1: { a: { points: 140 } } } };
  assert.equal(rules.isRoundClosed(duel, start + 5_000), false);
  assert.equal(rules.isRoundClosed(duel, start + rules.ROUND_MS + rules.GRACE_MS), true);
  duel.answers['1'].b = { points: 0 };
  assert.equal(rules.isRoundClosed(duel, start + 5_000), true);
  // Totals never count the open round, so they can't leak a right answer.
  const open = { ...duel, answers: { 1: { a: { points: 140 } } } };
  assert.deepEqual(rules.totals(open, start + 5_000), { a: 0, b: 0 });
});

test('tiebreak: highest total after ten rounds wins; a level score goes to sudden death', () => {
  const ten = (a, b) => Array.from({ length: ROUNDS }, () => ({ a, b }));
  assert.equal(rules.decideWinner(playedDuel(ten(120, 110)), Date.now()), 'a');
  assert.equal(rules.decideWinner(playedDuel(ten(120, 120)), Date.now()), null);
  assert.equal(rules.decideWinner(playedDuel([...ten(120, 120), { a: 0, b: 101 }]), Date.now()), 'b');
  // Nobody wins before regulation is over, however big the lead.
  assert.equal(rules.decideWinner(playedDuel([{ a: 150, b: 0 }]), Date.now()), null);
});

test('tiebreak: the finished duel puts its winner first while the tie still holds', () => {
  const duel = { ...playedDuel(Array.from({ length: ROUNDS }, () => ({ a: 100, b: 140 }))), winner_id: 'b' };
  const board = [entry('a', 95), entry('b', 95), entry('c', 90)];
  const ordered = rules.applyDuelResult(board, duel);
  assert.deepEqual(ordered.map((e) => e.userId), ['b', 'a', 'c']);
  assert.equal(ordered[0].tiebreakWinner, true);

  // A later grade broke the tie on its own: the duel no longer reorders anything.
  const moved = [entry('a', 96), entry('b', 95), entry('c', 90)];
  assert.deepEqual(rules.applyDuelResult(moved, duel).map((e) => e.userId), ['a', 'b', 'c']);
  // Practice duels never touch standings.
  assert.deepEqual(rules.applyDuelResult(board, { ...duel, practice: true }).map((e) => e.userId), ['a', 'b', 'c']);
});
