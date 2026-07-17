'use strict';
const { Submission, Assignment, AssignmentUnlock, Enrollment, Squad, User } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const logger      = require('../utils/logger');
const gradeService = require('./grade.service');
const { invalidateStudentCache } = require('./assignment.service');
const { gradeQuizAnswers, isFullyAutoGradable } = require('../utils/quizGrading');

async function listByAssignment(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  return Submission.findAll({
    where:   { assignment_id: assignmentId },
    include: [
      { model: User,  as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: Squad, as: 'squad',   attributes: ['id', 'number', 'name'] },
    ],
    order: [['submitted_at', 'DESC']],
  });
}

async function getMySubmission(assignmentId, userId) {
  return Submission.findOne({
    where:   { assignment_id: assignmentId, user_id: userId },
    include: [{ model: Squad, as: 'squad', attributes: ['id', 'number', 'name'] }],
  });
}

async function getSquadSubmission(assignmentId, squadId) {
  return Submission.findOne({
    where: { assignment_id: assignmentId, squad_id: squadId, status: { [require('sequelize').Op.in]: ['submitted', 'graded', 'returned'] } },
    include: [{ model: User, as: 'student', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['submitted_at', 'DESC']],
  });
}

/* Live per-question scoring from a quiz_state blob ({qIdx, answers, qStates})
   against the assignment's own question list — same accounting QuizFlow.jsx
   itself uses to compute a final score, just read back out mid-attempt for
   the Live Progress admin view. `available` is a question's current earned
   value once resolved (already reduced by wrong attempts/hints); resolved-
   but-forced questions contribute 0, matching QuizFlow's own tally. */
function computePerformance(quizState, questions) {
  const qStates = quizState?.qStates ?? {};
  let earnedPoints  = 0;
  let attemptedCount = 0;
  let correctCount    = 0;

  for (const q of questions) {
    const st = qStates[q.id];
    if (!st || !(st.revealed || st.forced)) continue;
    attemptedCount += 1;
    if (st.revealed) {
      correctCount += 1;
      earnedPoints += st.available ?? 0;
    }
  }

  return {
    earnedPoints,
    attemptedCount,
    correctCount,
    totalQuestions: questions.length,
  };
}

async function getProgressForAssignment(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'questions', 'max_score'] });
  if (!assignment) throw new NotFoundError('Assignment');
  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];

  const subs = await Submission.findAll({
    where:   { assignment_id: assignmentId },
    include: [
      { model: User,  as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: Squad, as: 'squad',   attributes: ['id', 'number', 'name'] },
    ],
    order: [['updated_at', 'DESC']],
  });

  if (questions.length === 0) return subs;

  return subs.map((sub) => {
    const json = sub.toJSON();
    if (sub.status === 'in_progress' && sub.quiz_state) {
      json.performance = { ...computePerformance(sub.quiz_state, questions), maxScore: Number(assignment.max_score) };
    }
    return json;
  });
}

async function _checkUnlocked(assignment, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: assignment.course_id } });
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  if (!enrollment.cohort_id) throw new AppError('You are not assigned to a cohort yet', 403, 'FORBIDDEN');

  const unlock = await AssignmentUnlock.findOne({ where: { assignment_id: assignment.id, cohort_id: enrollment.cohort_id } });

  // An explicit squad/cohort unlock supersedes is_published — the instructor's unlock is the gate
  if (!unlock) {
    if (!assignment.is_published) throw new AppError('This assignment has not been unlocked for your cohort yet', 403, 'LOCKED');
  }

  return enrollment;
}

async function updateProgress(assignmentId, userId, progress, quizState = null) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const enrollment = await _checkUnlocked(assignment, userId);

  const squadId = enrollment.squad_id ?? null;

  const [sub] = await Submission.findOrCreate({
    where:    { assignment_id: assignmentId, user_id: userId },
    defaults: { squad_id: squadId, progress, quiz_state: quizState, status: 'in_progress', content: null, submitted_at: new Date() },
  });

  if (sub.status === 'submitted' || sub.status === 'graded') return sub;

  await sub.update({
    progress:   Math.min(100, Math.max(0, progress)),
    status:     'in_progress',
    // quiz_state powers the Live Progress admin view's per-student score/
    // accuracy while the challenge is still in progress — only overwrite it
    // when the caller actually sent one (freeform/non-quiz submissions still
    // call this endpoint with just a percentage).
    ...(quizState ? { quiz_state: quizState } : {}),
  });
  invalidateStudentCache(assignment.course_id, userId);
  return sub;
}

async function submit(assignmentId, userId, content) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const enrollment = await _checkUnlocked(assignment, userId);
  const squadId = enrollment.squad_id ?? null;

  const sharedRoleTasking = Array.isArray(assignment.role_filters) && assignment.role_filters.length > 0;
  const sharedSubmission = assignment.grading_mode === 'squad' || sharedRoleTasking;
  if (sharedSubmission && !squadId) {
    throw new AppError('You must be assigned to a squad to submit this assignment', 400, 'NO_SQUAD');
  }

  // Atomic upsert on (assignment_id, user_id) — a plain findOne+create/update here
  // raced under double-submits (two concurrent requests both see no existing row
  // and both create one); the DB-level unique constraint + upsert closes that race.
  const [submission] = await Submission.upsert(
    {
      assignment_id: assignmentId,
      user_id:       userId,
      squad_id:      squadId,
      content,
      submitted_at:  new Date(),
      status:        'submitted',
      progress:      100,
    },
    { conflictFields: ['assignment_id', 'user_id'] }
  );

  if (sharedRoleTasking) {
    const members = await Enrollment.findAll({
      where: { squad_id: squadId, course_id: assignment.course_id, status: 'active' },
      include: [{ model: User, attributes: ['id', 'professional_role'] }],
    });
    const eligibleIds = members
      .filter((member) => assignment.role_filters.includes(member.User?.professional_role))
      .map((member) => member.user_id);
    await Promise.all(eligibleIds.filter((id) => id !== userId).map((id) => Submission.upsert({
      assignment_id: assignmentId, user_id: id, squad_id: squadId, content,
      submitted_at: new Date(), status: 'submitted', progress: 100,
    }, { conflictFields: ['assignment_id', 'user_id'] })));
  }

  invalidateStudentCache(assignment.course_id, userId);

  // Auto-grade quiz submissions. QuizFlow submits { answers: [{questionId,
  // raw, ...}], totalScore, maxScore } — totalScore/maxScore (and each
  // answer's isCorrect/points) are the client's own self-reported grade and
  // MUST NOT be trusted: the request body is fully client-controlled, so
  // trusting them let any student hand themselves (and their whole squad,
  // for squad-graded assignments) an arbitrary score, including forging
  // what gets passed back to an external gradebook via LTI. The score is
  // recomputed here from the assignment's own answer key (server-side,
  // never sent verbatim to the client as a "trust me" value) plus only the
  // raw per-question answers the student gave. Routed through
  // grade.service.js's autoGradeQuiz — the one place responsible for
  // fanning a squad-graded assignment's score out to every squad member
  // (not just whoever happened to click submit), the same way the
  // instructor-driven gradeSquad() already does.
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : null;
    if (Array.isArray(parsed?.answers) && isFullyAutoGradable(assignment.questions)) {
      const { totalScore, maxScore } = gradeQuizAnswers(assignment.questions, parsed.answers);
      await gradeService.autoGradeQuiz(assignment, userId, squadId, totalScore, maxScore);
      // Every question in a quiz-routed submission is auto-gradable (see
      // AssignmentPage.jsx's hasQuiz routing — mixing in a manually-graded
      // prompt question routes the whole assignment to ChallengeFlow
      // instead), so nothing is left for an instructor to review.
      await submission.update({ status: 'graded' });
    }
  } catch (err) {
    logger.error('Quiz auto-grade failed', { error: err.message, assignmentId, userId });
  }

  return submission;
}

async function updateStatus(submissionId, status) {
  const sub = await Submission.findByPk(submissionId);
  if (!sub) throw new NotFoundError('Submission');
  await sub.update({ status });
  return sub;
}

module.exports = { listByAssignment, getMySubmission, getSquadSubmission, getProgressForAssignment, updateProgress, submit, updateStatus };
