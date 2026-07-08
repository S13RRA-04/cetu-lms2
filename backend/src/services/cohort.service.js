'use strict';
const { Cohort, Course, Enrollment, User } = require('../models');
const { NotFoundError, ConflictError }     = require('../utils/errors');

async function listByCourse(courseId) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  return Cohort.findAll({
    where:   { course_id: courseId },
    include: [{ model: User, as: 'members', attributes: ['id', 'first_name', 'last_name', 'email', 'username'], through: { attributes: ['status', 'enrolled_at'] } }],
    order:   [['start_date', 'ASC'], ['name', 'ASC']],
  });
}

async function getById(cohortId) {
  const cohort = await Cohort.findByPk(cohortId, {
    include: [{ model: User, as: 'members', attributes: ['id', 'first_name', 'last_name', 'email', 'username'], through: { attributes: ['id', 'status', 'enrolled_at'] } }],
  });
  if (!cohort) throw new NotFoundError('Cohort');
  return cohort;
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return Cohort.create({ ...data, course_id: courseId });
}

async function update(cohortId, data) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');
  return cohort.update(data);
}

async function remove(cohortId) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');
  await cohort.destroy();
}

async function _enrollUser(cohort, userId) {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundError('User');

  const existing = await Enrollment.findOne({ where: { user_id: userId, course_id: cohort.course_id } });

  if (existing) {
    await existing.update({ cohort_id: cohort.id, status: 'active' });
  } else {
    await Enrollment.create({
      user_id:   userId,
      course_id: cohort.course_id,
      cohort_id: cohort.id,
      role:      'student',
      status:    'active',
    });
  }
}

async function addMember(cohortId, userId) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  await _enrollUser(cohort, userId);
  return getById(cohortId);
}

async function addMembers(cohortId, userIds) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  for (const userId of userIds) {
    await _enrollUser(cohort, userId);
  }

  return getById(cohortId);
}

async function removeMember(cohortId, userId) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: cohort.course_id, cohort_id: cohortId } });
  if (!enrollment) throw new NotFoundError('Enrollment');

  await enrollment.destroy();
}

module.exports = { listByCourse, getById, create, update, remove, addMember, addMembers, removeMember };
