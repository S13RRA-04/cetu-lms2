'use strict';
const { SquadChallengeState, Enrollment, Assignment } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');

function isResolved(qs) {
  return !!(qs && (qs.revealed || qs.forced));
}

/* A question's shared state is "owned" by whichever side has it resolved; if
   neither side has resolved it yet, the side with more attempts spent (lower
   `available`) wins so a stale/default push from one squad member can't
   clobber another member's in-progress attempts on the same question. Hint
   usage is OR'd — a hint spent by anyone in the squad stays spent. */
function mergeQState(a, b) {
  if (!a) return b;
  if (!b) return a;
  const aResolved = isResolved(a);
  const bResolved = isResolved(b);
  if (aResolved && !bResolved) return a;
  if (bResolved && !aResolved) return b;
  if (aResolved && bResolved) return b; // both resolved — values should already agree; take the latest
  const winner = (a.available ?? Infinity) <= (b.available ?? Infinity) ? a : b;
  return { ...winner, hintUsed: !!(a.hintUsed || b.hintUsed) };
}

function mergeState(stored, incoming, questions) {
  const storedQ   = stored?.qStates ?? {};
  const incomingQ = incoming?.qStates ?? {};
  const storedA   = stored?.answers ?? {};
  const incomingA = incoming?.answers ?? {};

  const qStates = {};
  const answers = {};
  for (const q of questions) {
    const a = storedQ[q.id];
    const b = incomingQ[q.id];
    const merged = mergeQState(a, b);
    if (merged) qStates[q.id] = merged;
    answers[q.id] = merged === a ? storedA[q.id] : incomingA[q.id];
  }

  // Recomputed server-side (not trusted from the client) — the squad's shared
  // position is the first question that isn't resolved for anyone yet.
  let qIdx = questions.findIndex((q) => !isResolved(qStates[q.id]));
  if (qIdx === -1) qIdx = Math.max(0, questions.length - 1);

  return { qIdx, answers, qStates };
}

async function _resolveSquadId(courseId, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  return enrollment?.squad_id ?? null;
}

async function getState(courseId, assignmentId, userId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.grading_mode !== 'squad') return null;

  const squadId = await _resolveSquadId(courseId, userId);
  if (!squadId) return null;

  const row = await SquadChallengeState.findOne({ where: { assignment_id: assignmentId, squad_id: squadId } });
  return row ? row.quiz_state : null;
}

async function saveState(courseId, assignmentId, userId, incomingState) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.grading_mode !== 'squad') {
    throw new AppError('This assignment is not squad-graded', 400, 'BAD_REQUEST');
  }

  const squadId = await _resolveSquadId(courseId, userId);
  if (!squadId) throw new ForbiddenError('You are not assigned to a squad');

  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];

  const [row] = await SquadChallengeState.findOrCreate({
    where:    { assignment_id: assignmentId, squad_id: squadId },
    defaults: { quiz_state: incomingState, updated_by: userId },
  });

  const merged = mergeState(row.quiz_state, incomingState, questions);
  await row.update({ quiz_state: merged, updated_by: userId });
  return merged;
}

module.exports = { getState, saveState };
