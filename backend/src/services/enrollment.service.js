'use strict';
const { Enrollment, User, Course } = require('../models');
const { NotFoundError, AppError }  = require('../utils/errors');

async function listByCourse(courseId) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  return Enrollment.findAll({
    where:   { course_id: courseId },
    include: [{ model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'username'] }],
    order:   [['enrolled_at', 'DESC']],
  });
}

async function enroll(courseId, userId, role = 'student') {
  const [course, user] = await Promise.all([Course.findByPk(courseId), User.findByPk(userId)]);
  if (!course) throw new NotFoundError('Course');
  if (!user)   throw new NotFoundError('User');

  const existing = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (existing) {
    if (existing.status === 'withdrawn') {
      return existing.update({ status: 'active', enrolled_at: new Date() });
    }
    throw new AppError('User is already enrolled in this course', 409, 'ALREADY_ENROLLED');
  }

  return Enrollment.create({ user_id: userId, course_id: courseId, role, status: 'active', enrolled_at: new Date() });
}

async function updateEnrollment(courseId, userId, data) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (!enrollment) throw new NotFoundError('Enrollment');
  return enrollment.update(data);
}

async function unenroll(courseId, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (!enrollment) throw new NotFoundError('Enrollment');
  return enrollment.update({ status: 'withdrawn' });
}

module.exports = { listByCourse, enroll, updateEnrollment, unenroll };
