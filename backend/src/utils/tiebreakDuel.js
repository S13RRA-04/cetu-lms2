'use strict';
/* Rules for the first-place tiebreak duel: who is tied, how questions are
   drawn, how a round is scored and closed, and who won. Pure — the service
   (services/tiebreakDuel.service.js) owns the database and grade.service.js
   uses applyDuelResult to order the Operators board.

   A duel is ROUNDS timed multiple-choice questions. A correct answer earns
   BASE_POINTS plus up to SPEED_POINTS for answering fast; a wrong or missing
   answer earns nothing. Highest total wins. If the totals are still level
   after the last round, sudden-death rounds continue until they aren't. */

const { ROUNDS } = require('../constants/lightningDuelBank');

const ROUND_MS     = 20_000;
const GRACE_MS     = 1_500; // network slack for an answer sent at the buzzer
const BASE_POINTS  = 100;
const SPEED_POINTS = 50;
const OPTION_IDS   = ['a', 'b', 'c', 'd'];

// Students tied for first on the Operators board: ranking-eligible entries
// sharing the top performance percentage. Fewer than two means no tie.
function findLeaderTie(board) {
  const eligible = board.filter((e) => e.rankingEligible);
  if (eligible.length < 2) return [];
  const top = eligible[0].performancePercent;
  const tied = eligible.filter((e) => e.performancePercent === top);
  return tied.length >= 2 ? tied : [];
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The duel's question snapshot: the whole bank in random order (the first
// ROUNDS are the regulation rounds, the rest feed sudden death), each with
// its options shuffled. Bank entries list the correct option first.
function drawQuestions(bank, rng = Math.random) {
  return shuffle(bank, rng).map((entry) => {
    const options = shuffle(entry.options.map((text, i) => ({ text, isCorrect: i === 0 })), rng)
      .map((o, i) => ({ id: OPTION_IDS[i], text: o.text, isCorrect: o.isCorrect }));
    return {
      id: entry.id,
      stem: entry.stem,
      options: options.map(({ id, text }) => ({ id, text })),
      correct: options.find((o) => o.isCorrect).id,
    };
  });
}

function roundPoints(correct, elapsedMs) {
  if (!correct) return 0;
  const left = Math.max(0, ROUND_MS - Math.max(0, elapsedMs));
  return BASE_POINTS + Math.round(SPEED_POINTS * (left / ROUND_MS));
}

function roundAnswers(duel, round) {
  return duel.answers?.[String(round)] ?? {};
}

// A round closes once every duelist has answered or the clock (plus grace)
// has run out.
function isRoundClosed(duel, now) {
  if (duel.round < 1 || !duel.round_started_at) return false;
  const answered = roundAnswers(duel, duel.round);
  if (duel.participant_ids.every((id) => answered[id])) return true;
  return now - new Date(duel.round_started_at).getTime() >= ROUND_MS + GRACE_MS;
}

// Rounds whose results are public: every round before the current one, plus
// the current one once it has closed. Totals only ever count these, so a
// running total never gives away whether an open round's answer was right.
function closedRounds(duel, now) {
  const last = isRoundClosed(duel, now) ? duel.round : duel.round - 1;
  return Array.from({ length: Math.max(0, last) }, (_, i) => i + 1);
}

function totals(duel, now) {
  const sums = Object.fromEntries(duel.participant_ids.map((id) => [id, 0]));
  for (const round of closedRounds(duel, now)) {
    const answered = roundAnswers(duel, round);
    for (const id of duel.participant_ids) sums[id] += answered[id]?.points ?? 0;
  }
  return sums;
}

// After a closed round at or past regulation: the sole leader, or null while
// the top is still shared (sudden death continues).
function decideWinner(duel, now) {
  if (duel.round < ROUNDS || !isRoundClosed(duel, now)) return null;
  const sums = totals(duel, now);
  const best = Math.max(...Object.values(sums));
  const leaders = Object.keys(sums).filter((id) => sums[id] === best);
  return leaders.length === 1 ? leaders[0] : null;
}

// Order the Operators board by a finished duel: while its winner is still
// tied for first, the duelists inside that tie move to the top in duel
// order and the winner is flagged. Once the tie no longer holds (a grade
// changed afterward), the duel has nothing left to settle.
function applyDuelResult(board, duel) {
  if (!duel?.winner_id || duel.practice) return board;
  const tie = findLeaderTie(board);
  if (!tie.some((e) => e.userId === duel.winner_id)) return board;
  const sums = totals(duel, Number.POSITIVE_INFINITY);
  const inDuel = (e) => e.userId in sums;
  const duelists = tie.filter(inDuel).sort((a, b) =>
    (b.userId === duel.winner_id) - (a.userId === duel.winner_id) || sums[b.userId] - sums[a.userId]);
  const tieIds = new Set(tie.map((e) => e.userId));
  const rest = board.filter((e) => !tieIds.has(e.userId));
  return [...duelists, ...tie.filter((e) => !inDuel(e)), ...rest]
    .map((e) => (e.userId === duel.winner_id ? { ...e, tiebreakWinner: true } : e));
}

module.exports = {
  ROUND_MS, GRACE_MS, BASE_POINTS, SPEED_POINTS,
  findLeaderTie, drawQuestions, roundPoints, isRoundClosed, closedRounds, totals, decideWinner, applyDuelResult,
};
