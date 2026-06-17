'use strict';
const { Submission, Assignment, AssignmentUnlock, Enrollment, Squad, User, Grade } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const ltiService = require('./lti.service');
const logger     = require('../utils/logger');

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
    where: { assignment_id: assignmentId, cell_id: squadId, status: { [require('sequelize').Op.in]: ['submitted', 'graded', 'returned'] } },
    include: [{ model: User, as: 'student', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['submitted_at', 'DESC']],
  });
}

async function getProgressForAssignment(assignmentId) {
  return Submission.findAll({
    where:   { assignment_id: assignmentId },
    include: [
      { model: User,  as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { model: Squad, as: 'squad',   attributes: ['id', 'number', 'name'] },
    ],
    order: [['updated_at', 'DESC']],
  });
}

async function _checkUnlocked(assignment, userId) {
  if (!assignment.is_published) throw new AppError('Assignment is not published', 403, 'FORBIDDEN');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: assignment.course_id } });
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  if (!enrollment.cohort_id) throw new AppError('You are not assigned to a cohort yet', 403, 'FORBIDDEN');

  const unlock = await AssignmentUnlock.findOne({ where: { assignment_id: assignment.id, cohort_id: enrollment.cohort_id } });
  if (!unlock) throw new AppError('This assignment has not been unlocked for your cohort yet', 403, 'LOCKED');

  return enrollment;
}

async function updateProgress(assignmentId, userId, progress) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const enrollment = await _checkUnlocked(assignment, userId);

  const squadId = enrollment.cell_id ?? null;

  const [sub] = await Submission.findOrCreate({
    where:    { assignment_id: assignmentId, user_id: userId },
    defaults: { cell_id: squadId, progress, status: 'in_progress', content: null, submitted_at: new Date() },
  });

  if (sub.status === 'submitted' || sub.status === 'graded') return sub;

  await sub.update({ progress: Math.min(100, Math.max(0, progress)), status: 'in_progress' });
  return sub;
}

async function submit(assignmentId, userId, content) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const enrollment = await _checkUnlocked(assignment, userId);
  const squadId = enrollment.cell_id ?? null;

  if (assignment.grading_mode === 'squad' && !squadId) {
    throw new AppError('You must be assigned to a squad to submit this assignment', 400, 'NO_SQUAD');
  }

  // For squad assignments: upsert on (assignment_id, user_id) — any member can submit
  const existing = await Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
  let submission;
  if (existing) {
    await existing.update({ content, submitted_at: new Date(), status: 'submitted', progress: 100, cell_id: squadId });
    submission = existing;
  } else {
    submission = await Submission.create({ assignment_id: assignmentId, user_id: userId, cell_id: squadId, content, submitted_at: new Date(), status: 'submitted', progress: 100 });
  }

  // Auto-grade quiz submissions: QuizFlow embeds totalScore + maxScore in the content JSON
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : null;
    if (parsed?.totalScore !== undefined && parsed?.maxScore !== undefined) {
      const [grade, created] = await Grade.findOrCreate({
        where:    { assignment_id: assignmentId, user_id: userId },
        defaults: { score: parsed.totalScore, max_score: parsed.maxScore, graded_at: new Date(), graded_by: null },
      });
      if (!created) {
        await grade.update({ score: parsed.totalScore, max_score: parsed.maxScore, graded_at: new Date() });
      }
      if (assignment.lineitem_url) {
        ltiService.publishGradeAsync(assignment, userId, parsed.totalScore).catch((err) => {
          logger.error('Background AGS passback failed for quiz auto-grade', { error: err.message });
        });
      }
    }
  } catch {}

  return submission;
}

async function updateStatus(submissionId, status) {
  const sub = await Submission.findByPk(submissionId);
  if (!sub) throw new NotFoundError('Submission');
  await sub.update({ status });
  return sub;
}

module.exports = { listByAssignment, getMySubmission, getSquadSubmission, getProgressForAssignment, updateProgress, submit, updateStatus };
