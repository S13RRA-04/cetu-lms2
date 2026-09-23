'use strict';
const { Op } = require('sequelize');
const { Submission, Assignment, AssignmentUnlock, Enrollment, Squad, User, Grade, Cohort } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const logger      = require('../utils/logger');
const gradeService = require('./grade.service');
const { invalidateStudentCache } = require('./assignment.service');
const { gradeQuizAnswers, isFullyAutoGradable } = require('../utils/quizGrading');

async function listByAssignment(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type === 'survey') {
    throw new ForbiddenError('Individual survey submissions are anonymous; use aggregate survey results');
  }

  const submissions = await Submission.findAll({
    where:   { assignment_id: assignmentId },
    include: [
      { model: User,  as: 'student', attributes: ['id', 'first_name', 'last_name', 'email', 'professional_role'] },
      { model: Squad, as: 'squad',   attributes: ['id', 'number', 'name'] },
    ],
    order: [['submitted_at', 'DESC']],
  });
  if (submissions.length === 0) return submissions;

  // Grade Center filters/groups by cohort — derived from each submitter's own
  // Enrollment (not Squad.cohort_id) so it's still correct for a submission
  // recorded before the student had a squad, or if they never got one.
  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const enrollments = await Enrollment.findAll({
    where:      { course_id: assignment.course_id, user_id: userIds },
    include:    [{ model: Cohort, as: 'cohort', attributes: ['id', 'name'] }],
    attributes: ['user_id'],
  });
  const cohortByUser = Object.fromEntries(enrollments.map((e) => [e.user_id, e.cohort ?? null]));

  return submissions.map((s) => ({ ...s.toJSON(), cohort: cohortByUser[s.user_id] ?? null }));
}

async function getMySubmission(assignmentId, userId) {
  const own = await Submission.findOne({
    where:   { assignment_id: assignmentId, user_id: userId },
    include: [{ model: Squad, as: 'squad', attributes: ['id', 'number', 'name'] }],
  });
  if (own && ['submitted', 'graded', 'returned'].includes(own.status)) return own;

  // A squad assignment is one submission for the whole squad — a squadmate
  // opening it after someone else submitted must see it as already submitted,
  // not as an empty attempt they could submit again.
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'course_id', 'grading_mode'] });
  if (assignment?.grading_mode !== 'squad') return own;
  const enrollment = await Enrollment.findOne({
    where: { user_id: userId, course_id: assignment.course_id, status: 'active' },
    attributes: ['squad_id'],
  });
  if (!enrollment?.squad_id) return own;
  return (await getSquadSubmission(assignmentId, enrollment.squad_id)) ?? own;
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

async function getProgressForAssignment(assignmentId, filters = {}) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'course_id', 'type', 'questions', 'max_score'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type === 'survey') {
    throw new ForbiddenError('Individual survey progress is anonymous; use aggregate live progress');
  }
  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
  const enrollmentWhere = {
    course_id: assignment.course_id,
    ...(filters.cohort_id ? { cohort_id: filters.cohort_id } : {}),
    ...(filters.squad_id ? { squad_id: filters.squad_id } : {}),
  };
  const scopedEnrollments = await Enrollment.findAll({
    where: enrollmentWhere,
    attributes: ['user_id'],
  });
  const scopedUserIds = scopedEnrollments.map((enrollment) => enrollment.user_id);
  if (scopedUserIds.length === 0) return [];

  const subs = await Submission.findAll({
    where:   { assignment_id: assignmentId, user_id: scopedUserIds },
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

  // grading_mode is the only thing that makes a submission shared: a squad
  // assignment is submitted once for the whole squad, an individual one only
  // ever for the person submitting it — role_filters only control who can see
  // an assignment, never who its submission or grade belongs to.
  if (assignment.grading_mode === 'squad' && !squadId) {
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

/* Let an instructor reopen a graded/submitted individual assignment for
   another attempt. Content and quiz_state are left as-is on purpose — the
   student/squad revises their existing answers rather than starting blank
   (ChallengeFlow already prefills from existingContent; QuizFlow's own
   per-question qStates never round-trip through the server for an
   individual attempt in the first place). The prior grade is deleted since
   there is no versioning on Grade — once reopened, the old score no longer
   reflects the assignment's current state and must not linger as if still
   valid. */
async function reopenSubmission(assignmentId, userId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.grading_mode === 'squad') {
    throw new AppError('This is a squad-graded assignment — reopen it for the whole squad instead', 400, 'BAD_REQUEST');
  }

  const submission = await Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
  if (!submission) throw new NotFoundError('Submission');

  await Grade.destroy({ where: { assignment_id: assignmentId, user_id: userId } });
  if (submission.status !== 'in_progress') await submission.update({ status: 'in_progress' });
  invalidateStudentCache(assignment.course_id, userId);
  return submission;
}

/* Same, for a squad-graded assignment — there is exactly one Submission row
   per squad (owned by whoever clicked submit) but a Grade row per squad
   member (gradeSquad fans out), so every current member's grade is cleared,
   not just the submitter's. */
async function reopenSquadAttempt(assignmentId, squadId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.grading_mode !== 'squad') {
    throw new AppError('This assignment is not squad-graded', 400, 'BAD_REQUEST');
  }

  const submission = await Submission.findOne({
    where: { assignment_id: assignmentId, squad_id: squadId, status: { [Op.in]: ['submitted', 'graded', 'returned'] } },
    order: [['submitted_at', 'DESC']],
  });
  if (!submission) throw new NotFoundError('Submission');

  const members = await Enrollment.findAll({
    where: { squad_id: squadId, course_id: assignment.course_id, status: 'active' },
    attributes: ['user_id'],
  });
  const memberIds = members.map((m) => m.user_id);
  if (memberIds.length > 0) {
    await Grade.destroy({ where: { assignment_id: assignmentId, user_id: { [Op.in]: memberIds } } });
  }
  await submission.update({ status: 'in_progress' });
  invalidateStudentCache(assignment.course_id, submission.user_id);
  return submission;
}

module.exports = { listByAssignment, getMySubmission, getSquadSubmission, getProgressForAssignment, updateProgress, submit, updateStatus, reopenSubmission, reopenSquadAttempt };
