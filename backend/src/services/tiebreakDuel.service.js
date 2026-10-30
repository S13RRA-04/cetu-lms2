'use strict';
const { Op } = require('sequelize');
const { sequelize, TiebreakDuel, User, Enrollment, Squad, Cohort } = require('../models');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { LIGHTNING_BANK, ROUNDS } = require('../constants/lightningDuelBank');
const rules = require('../utils/tiebreakDuel');
const gradeService = require('./grade.service');

/* First-place tiebreak duel on the Operators board. The instructor opens a
   duel for the students tied for first (or a practice duel between any
   students), then starts each round from Command; duelists answer on their
   own devices and the server keeps the clock and the score. */

const OPEN = ['ready', 'live'];
// A finished practice duel stays on the Standings page briefly, then drops
// off; a real one stays, since it decided first place.
const PRACTICE_RESULT_MS = 30 * 60 * 1000;

async function activeCohortId(courseId) {
  const cohort = await Cohort.findOne({ where: { course_id: courseId, is_active: true }, attributes: ['id'] });
  return cohort?.id ?? null;
}

async function latestDuel(courseId, cohortId) {
  return TiebreakDuel.findOne({
    where: { course_id: courseId, cohort_id: cohortId, status: { [Op.ne]: 'cancelled' } },
    order: [['created_at', 'DESC']],
  });
}

async function participantInfo(duel) {
  const [users, enrollments] = await Promise.all([
    User.findAll({ where: { id: duel.participant_ids }, attributes: ['id', 'first_name', 'last_name'] }),
    Enrollment.findAll({
      where: { user_id: duel.participant_ids, cohort_id: duel.cohort_id },
      include: [{ model: Squad, as: 'squad', attributes: ['number', 'name'], required: false }],
      attributes: ['user_id'],
    }),
  ]);
  return Object.fromEntries(duel.participant_ids.map((id) => {
    const u = users.find((x) => x.id === id);
    const sq = enrollments.find((e) => e.user_id === id)?.squad;
    return [id, {
      name: u ? `${u.first_name} ${u.last_name}`.trim() : 'Unknown',
      squad: sq ? `Squad ${sq.number}${sq.name ? ` · ${sq.name}` : ''}` : null,
    }];
  }));
}

// What one viewer may see. The correct option and each duelist's pick stay
// hidden until the round closes; everyone sees who has locked in.
async function view(duel, viewerId, { now = Date.now() } = {}) {
  if (!duel) return null;
  const info = await participantInfo(duel);
  const closed = rules.isRoundClosed(duel, now);
  const sums = rules.totals(duel, now);
  const current = duel.round > 0 ? duel.questions[duel.round - 1] : null;
  const answered = duel.answers?.[String(duel.round)] ?? {};
  const remaining = duel.status === 'live' && duel.round_started_at && !closed
    ? Math.max(0, rules.ROUND_MS - (now - new Date(duel.round_started_at).getTime()))
    : 0;
  const isParticipant = duel.participant_ids.includes(viewerId);

  return {
    id: duel.id,
    status: duel.status,
    practice: duel.practice,
    round: duel.round,
    regulation_rounds: ROUNDS,
    sudden_death: duel.round > ROUNDS,
    round_ms: rules.ROUND_MS,
    remaining_ms: remaining,
    round_closed: closed,
    winner_id: duel.winner_id,
    is_participant: isParticipant,
    question: current && duel.status !== 'ready' ? {
      stem: current.stem,
      options: current.options,
      correct: closed ? current.correct : undefined,
    } : null,
    my_answer: isParticipant && answered[viewerId] ? {
      choice: answered[viewerId].choice,
      correct: closed ? answered[viewerId].correct : undefined,
      points: closed ? answered[viewerId].points : undefined,
    } : null,
    participants: duel.participant_ids.map((id) => ({
      id,
      ...info[id],
      total: sums[id],
      locked_in: !!answered[id],
      last: closed && duel.round > 0 ? {
        choice: answered[id]?.choice ?? null,
        correct: !!answered[id]?.correct,
        points: answered[id]?.points ?? 0,
      } : null,
    })).sort((a, b) => b.total - a.total),
    rounds: rules.closedRounds(duel, now).map((round) => ({
      round,
      points: Object.fromEntries(duel.participant_ids.map((id) => [id, duel.answers?.[String(round)]?.[id]?.points ?? 0])),
    })),
  };
}

// Instructor view: the current tie on the Operators board plus the latest duel.
async function getStatus(courseId, cohortId, viewerId) {
  const board = await gradeService.queryScoreboard(courseId, cohortId, { applyDuel: false });
  const tie = rules.findLeaderTie(board).map((e) => ({
    id: e.userId,
    name: `${e.firstName} ${e.lastName}`,
    squad: e.squadNumber != null ? `Squad ${e.squadNumber}${e.squadName ? ` · ${e.squadName}` : ''}` : null,
    performance_percent: e.performancePercent,
  }));
  const leader = board.find((e) => e.rankingEligible) ?? null;
  return {
    tie,
    leader: leader ? { id: leader.userId, name: `${leader.firstName} ${leader.lastName}`, performance_percent: leader.performancePercent } : null,
    students: board.map((e) => ({ id: e.userId, name: `${e.firstName} ${e.lastName}` })),
    duel: await view(await latestDuel(courseId, cohortId), viewerId),
  };
}

// Student view: the active cohort's duel while it is open or recently decided.
async function getForStudent(courseId, userId) {
  const cohortId = await activeCohortId(courseId);
  if (!cohortId) return null;
  const duel = await latestDuel(courseId, cohortId);
  if (!duel) return null;
  if (duel.status === 'finished' && duel.practice && Date.now() - new Date(duel.updated_at).getTime() > PRACTICE_RESULT_MS) return null;
  return view(duel, userId);
}

async function create(courseId, cohortId, participantIds, createdBy) {
  const open = await TiebreakDuel.findOne({ where: { course_id: courseId, cohort_id: cohortId, status: OPEN } });
  if (open) throw new ValidationError('A duel is already open for this cohort — finish or cancel it first');

  let ids;
  const practice = Array.isArray(participantIds) && participantIds.length > 0;
  if (practice) {
    ids = [...new Set(participantIds)];
    if (ids.length < 2) throw new ValidationError('A practice duel needs at least two students');
    const enrolled = await Enrollment.count({ where: { user_id: ids, cohort_id: cohortId, status: 'active' }, distinct: true, col: 'user_id' });
    if (enrolled !== ids.length) throw new ValidationError('Every duelist must be an active student in this cohort');
  } else {
    const board = await gradeService.queryScoreboard(courseId, cohortId, { applyDuel: false });
    ids = rules.findLeaderTie(board).map((e) => e.userId);
    if (ids.length < 2) throw new ValidationError('There is no tie for first place on the Operators board');
  }

  const duel = await TiebreakDuel.create({
    course_id: courseId,
    cohort_id: cohortId,
    practice,
    participant_ids: ids,
    questions: rules.drawQuestions(LIGHTNING_BANK),
    created_by: createdBy,
  });
  return view(duel, createdBy);
}

async function lockDuel(courseId, duelId, transaction) {
  const duel = await TiebreakDuel.findOne({
    where: { id: duelId, course_id: courseId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!duel) throw new NotFoundError('Duel not found');
  return duel;
}

// Start the next round, or finish once the totals are no longer level after
// regulation. A tie after round 10 rolls into sudden death.
async function advance(courseId, duelId, viewerId) {
  const now = Date.now();
  const duel = await sequelize.transaction(async (t) => {
    const d = await lockDuel(courseId, duelId, t);
    if (!OPEN.includes(d.status)) throw new ValidationError('This duel is over');
    if (d.status === 'live' && !rules.isRoundClosed(d, now)) throw new ValidationError('The current round is still open');

    const winner = d.status === 'live' ? rules.decideWinner(d, now) : null;
    if (winner) {
      await d.update({ status: 'finished', winner_id: winner }, { transaction: t });
      return d;
    }
    if (d.round >= d.questions.length) throw new ValidationError('The question bank is exhausted');
    await d.update({ status: 'live', round: d.round + 1, round_started_at: new Date(now) }, { transaction: t });
    return d;
  });
  if (duel.status === 'finished' && !duel.practice) gradeService.invalidateScoreboard(courseId);
  return view(duel, viewerId);
}

async function cancel(courseId, duelId, viewerId) {
  const duel = await sequelize.transaction(async (t) => {
    const d = await lockDuel(courseId, duelId, t);
    if (!OPEN.includes(d.status)) throw new ValidationError('This duel is over');
    await d.update({ status: 'cancelled' }, { transaction: t });
    return d;
  });
  return view(duel, viewerId);
}

// One locked-in answer per duelist per round, timed by the server's clock.
async function answer(courseId, duelId, userId, round, choice) {
  const now = Date.now();
  const duel = await sequelize.transaction(async (t) => {
    const d = await lockDuel(courseId, duelId, t);
    if (!d.participant_ids.includes(userId)) throw new ForbiddenError('You are not in this duel');
    if (d.status !== 'live' || d.round !== round) throw new ValidationError('That round is not open');
    if (rules.isRoundClosed(d, now)) throw new ValidationError('Time is up for this round');
    const key = String(round);
    if (d.answers?.[key]?.[userId]) throw new ValidationError('Your answer is already locked in');
    const question = d.questions[round - 1];
    if (!question.options.some((o) => o.id === choice)) throw new ValidationError('Pick one of the options');

    const elapsed = now - new Date(d.round_started_at).getTime();
    const correct = choice === question.correct;
    const answers = { ...d.answers, [key]: { ...(d.answers?.[key] ?? {}), [userId]: { choice, correct, ms: elapsed, points: rules.roundPoints(correct, elapsed) } } };
    await d.update({ answers }, { transaction: t });
    return d;
  });
  return view(duel, userId);
}

module.exports = { getStatus, getForStudent, create, advance, cancel, answer, latestDuel };
