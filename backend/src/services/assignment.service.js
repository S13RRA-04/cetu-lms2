'use strict';
const { Op }             = require('sequelize');
const { Assignment, AssignmentUnlock, Course, Cohort, Enrollment, User, Submission } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listByCourse(courseId, query) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const { limit, offset, page } = paginate(query);
  const { rows, count } = await Assignment.findAndCountAll({
    where:   { course_id: courseId },
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    limit, offset,
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });
  return paginatedResponse(rows, count, { page, limit });
}

async function listForStudent(courseId, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  const unlocks = await AssignmentUnlock.findAll({ where: { cohort_id: enrollment.cohort_id } });
  const unlockedIds = new Set(unlocks.map((u) => u.assignment_id));

  const assignments = await Assignment.findAll({
    where: { course_id: courseId, is_published: true },
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  const submissions = await Submission.findAll({
    where: { assignment_id: assignments.map((a) => a.id), user_id: userId },
    attributes: ['assignment_id', 'progress', 'status'],
  });
  const progressMap = Object.fromEntries(submissions.map((s) => [s.assignment_id, s.progress ?? 0]));

  return assignments.map((a) => ({
    ...a.toJSON(),
    is_unlocked: unlockedIds.has(a.id),
    progress:    progressMap[a.id] ?? 0,
  }));
}

async function unlockForCohort(assignmentId, cohortId, unlockerId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const [unlock] = await AssignmentUnlock.findOrCreate({
    where:    { assignment_id: assignmentId, cohort_id: cohortId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });
  return unlock;
}

async function lockForCohort(assignmentId, cohortId) {
  await AssignmentUnlock.destroy({ where: { assignment_id: assignmentId, cohort_id: cohortId } });
}

async function getUnlockStatus(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment;
}

async function getById(id, userId = null) {
  const assignment = await Assignment.findByPk(id, {
    include: [{ model: Course, attributes: ['id', 'title', 'course_code'] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');

  if (userId) {
    const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: assignment.course_id } });
    if (enrollment?.cohort_id) {
      const unlock = await AssignmentUnlock.findOne({
        where: { assignment_id: id, cohort_id: enrollment.cohort_id },
      });
      return { ...assignment.toJSON(), is_unlocked: !!unlock };
    }
    return { ...assignment.toJSON(), is_unlocked: false };
  }

  return assignment;
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return Assignment.create({ ...data, course_id: courseId });
}

async function update(id, data) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment.update(data);
}

async function remove(id) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  await assignment.destroy();
}

module.exports = { listByCourse, listForStudent, getById, create, update, remove, unlockForCohort, lockForCohort, getUnlockStatus };
