'use strict';
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User }           = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listUsers(query) {
  const { limit, offset, page } = paginate(query);
  const where = {};
  if (query.role)   where.role      = query.role;
  if (query.is_active !== undefined) where.is_active = query.is_active === 'true' || query.is_active === true;
  if (query.search) {
    where[Op.or] = [
      { email:      { [Op.iLike]: `%${query.search}%` } },
      { username:   { [Op.iLike]: `%${query.search}%` } },
      { first_name: { [Op.iLike]: `%${query.search}%` } },
      { last_name:  { [Op.iLike]: `%${query.search}%` } },
    ];
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
    role:          data.role      || 'student',
    is_active:     data.is_active !== undefined ? data.is_active : true,
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
