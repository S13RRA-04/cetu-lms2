'use strict';
const { Cell, Cohort, Enrollment, User } = require('../models');
const { NotFoundError, AppError }        = require('../utils/errors');

async function listByCohort(cohortId) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  return Cell.findAll({
    where:   { cohort_id: cohortId },
    include: [{
      model:      User,
      as:         'students',
      attributes: ['id', 'first_name', 'last_name', 'email', 'username', 'professional_role'],
      through:    { attributes: ['id', 'status'] },
    }],
    order: [['number', 'ASC']],
  });
}

async function create(cohortId, data) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const existing = await Cell.findOne({ where: { cohort_id: cohortId, number: data.number } });
  if (existing) throw new AppError(`Cell ${data.number} already exists in this cohort`, 409, 'CONFLICT');

  return Cell.create({ ...data, cohort_id: cohortId });
}

async function update(cellId, data) {
  const cell = await Cell.findByPk(cellId);
  if (!cell) throw new NotFoundError('Cell');
  return cell.update(data);
}

async function remove(cellId) {
  const cell = await Cell.findByPk(cellId);
  if (!cell) throw new NotFoundError('Cell');
  await Enrollment.update({ cell_id: null }, { where: { cell_id: cellId } });
  await cell.destroy();
}

async function assignMember(cellId, userId) {
  const cell = await Cell.findByPk(cellId);
  if (!cell) throw new NotFoundError('Cell');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, cohort_id: cell.cohort_id } });
  if (!enrollment) throw new AppError('User is not enrolled in this cohort', 400, 'NOT_ENROLLED');

  await Enrollment.update(
    { cell_id: null },
    { where: { user_id: userId, cohort_id: cell.cohort_id, cell_id: { [require('sequelize').Op.ne]: null } } }
  );

  await enrollment.update({ cell_id: cellId });
  return listByCohort(cell.cohort_id);
}

async function removeMember(cellId, userId) {
  const cell = await Cell.findByPk(cellId);
  if (!cell) throw new NotFoundError('Cell');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, cell_id: cellId } });
  if (!enrollment) throw new NotFoundError('Cell member');

  await enrollment.update({ cell_id: null });
}

module.exports = { listByCohort, create, update, remove, assignMember, removeMember };
