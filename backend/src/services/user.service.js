'use strict';
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Enrollment, Cohort } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listUsers(query) {
  const { limit, offset, page } = paginate(query);
  const where = {};
  if (query.role)              where.role              = query.role;
  if (query.professional_role) where.professional_role = query.professional_role;
  if (query.is_active !== undefined) where.is_active = query.is_active === 'true' || query.is_active === true;
  if (query.search) {
    where[Op.or] = [
      { email:      { [Op.iLike]: `%${query.search}%` } },
      { username:   { [Op.iLike]: `%${query.search}%` } },
      { first_name: { [Op.iLike]: `%${query.search}%` } },
      { last_name:  { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  // course_id/cohort_id are optional and additive — a course's own admin
  // console (e.g. PACT's User Management panel) passes course_id to attach
  // each user's cohort for that course (null for staff/unenrolled accounts,
  // who still appear), and cohort_id on top of that to narrow the roster
  // down to one cohort's actual members. Omitting both keeps this endpoint's
  // original course-agnostic behavior unchanged for other callers (e.g. the
  // cross-course admin app in frontend/).
  if (query.course_id) {
    const enrollmentWhere = { course_id: query.course_id };
    if (query.cohort_id) enrollmentWhere.cohort_id = query.cohort_id;

    const { rows, count } = await User.findAndCountAll({
      where,
      include: [{
        model:    Enrollment,
        required: !!query.cohort_id,
        where:    enrollmentWhere,
        include:  [{ model: Cohort, as: 'cohort', attributes: ['id', 'name'] }],
      }],
      limit, offset, order: [['created_at', 'DESC']],
      distinct: true,
    });
    return paginatedResponse(
      rows.map((u) => {
        const json = u.toJSON();
        const enrollment = json.Enrollments?.[0] ?? null;
        return { ...json, Enrollments: undefined, cohort: enrollment?.cohort ?? null };
      }),
      count,
      { page, limit },
    );
  }

  const { rows, count } = await User.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  return paginatedResponse(rows, count, { page, limit });
}

async function getUserById(id) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

async function createUser(data) {
  const hash = await bcrypt.hash(data.password, 12);
  return User.create({
    email:         data.email,
    username:      data.username,
    password_hash: hash,
    first_name:    data.first_name,
    last_name:     data.last_name,
    role:              data.role              || 'student',
    professional_role: data.professional_role || null,
    is_active:         data.is_active !== undefined ? data.is_active : true,
  });
}

async function updateUser(id, data) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('User');
  return user.update(data);
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('User');
  await user.destroy();
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
