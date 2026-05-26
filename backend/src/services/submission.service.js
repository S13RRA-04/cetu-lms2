'use strict';
const { Submission, Assignment, User } = require('../models');
const { NotFoundError, AppError }      = require('../utils/errors');

async function listByAssignment(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  return Submission.findAll({
    where:   { assignment_id: assignmentId },
    include: [{ model: User, as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    order:   [['submitted_at', 'DESC']],
  });
}

async function getMySubmission(assignmentId, userId) {
  return Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
}

async function submit(assignmentId, userId, content) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (!assignment.is_published) throw new AppError('Assignment is not published', 403, 'FORBIDDEN');

  const existing = await Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
  if (existing) {
    await existing.update({ content, submitted_at: new Date(), status: 'submitted' });
    return existing;
  }

  return Submission.create({ assignment_id: assignmentId, user_id: userId, content, submitted_at: new Date() });
}

async function updateStatus(submissionId, status) {
  const sub = await Submission.findByPk(submissionId);
  if (!sub) throw new NotFoundError('Submission');
  await sub.update({ status });
  return sub;
}

module.exports = { listByAssignment, getMySubmission, submit, updateStatus };
