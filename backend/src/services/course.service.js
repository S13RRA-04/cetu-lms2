'use strict';
const { Op }   = require('sequelize');
const { Course, Module, ContentItem, User, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { paginate, paginatedResponse }   = require('../utils/pagination');
const { ROLES }                         = require('../config/constants');

async function listCourses(query, requestingUser) {
  const { limit, offset, page } = paginate(query);
  const where = {};

  // Students only see published courses they're enrolled in (unless admin/instructor)
  if (requestingUser.role === ROLES.STUDENT) {
    where.status = 'published';
  } else if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where[Op.or] = [
      { title:       { [Op.iLike]: `%${query.search}%` } },
      { course_code: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Course.findAndCountAll({
    where,
    limit,
    offset,
    include: [{ model: User, as: 'instructor', attributes: ['id', 'first_name', 'last_name', 'email'] }],
    order:   [['created_at', 'DESC']],
  });

  return paginatedResponse(rows, count, { page, limit });
}

async function getCourseById(id) {
  const course = await Course.findByPk(id, {
    include: [
      { model: User, as: 'instructor', attributes: ['id', 'first_name', 'last_name', 'email'] },
      {
        model:   Module,
        as:      'modules',
        include: [{ model: ContentItem, as: 'contentItems', order: [['order_index', 'ASC']] }],
        order:   [['order_index', 'ASC']],
      },
    ],
  });
  if (!course) throw new NotFoundError('Course');
  return course;
}

async function createCourse(data, requestingUser) {
  if (!data.instructor_id) data.instructor_id = requestingUser.id;
  return Course.create(data);
}

async function updateCourse(id, data, requestingUser) {
  const course = await Course.findByPk(id);
  if (!course) throw new NotFoundError('Course');

  const isOwner = course.instructor_id === requestingUser.id;
  const isAdmin = [ROLES.ADMIN, ROLES.SUPERADMIN].includes(requestingUser.role);
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  return course.update(data);
}

async function deleteCourse(id) {
  const course = await Course.findByPk(id);
  if (!course) throw new NotFoundError('Course');
  await course.destroy();
}

async function listModules(courseId) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  return Module.findAll({
    where:   { course_id: courseId },
    include: [{ model: ContentItem, as: 'contentItems', order: [['order_index', 'ASC']] }],
    order:   [['order_index', 'ASC']],
  });
}

async function createModule(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return Module.create({ ...data, course_id: courseId });
}

async function updateModule(courseId, moduleId, data) {
  const mod = await Module.findOne({ where: { id: moduleId, course_id: courseId } });
  if (!mod) throw new NotFoundError('Module');
  return mod.update(data);
}

async function deleteModule(courseId, moduleId) {
  const mod = await Module.findOne({ where: { id: moduleId, course_id: courseId } });
  if (!mod) throw new NotFoundError('Module');
  await mod.destroy();
}

module.exports = {
  listCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  listModules, createModule, updateModule, deleteModule,
};
