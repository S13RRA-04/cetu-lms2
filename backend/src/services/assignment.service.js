'use strict';
const { Assignment, Course, Grade, User, Submission } = require('../models');
const { NotFoundError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listByCourse(courseId, query) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const { limit, offset, page } = paginate(query);
  const { rows, count } = await Assignment.findAndCountAll({
    where: { course_id: courseId },
    limit, offset,
    order: [['created_at', 'DESC']],
  });
  return paginatedResponse(rows, count, { page, limit });
}

async function getById(id) {
  const assignment = await Assignment.findByPk(id, {
    include: [{ model: Course, attributes: ['id', 'title', 'course_code'] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');
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

module.exports = { listByCourse, getById, create, update, remove };
