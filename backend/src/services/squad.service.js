'use strict';
const { Squad, Cohort, Enrollment, User } = require('../models');
const { NotFoundError, AppError }         = require('../utils/errors');

async function listByCohort(cohortId) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  return Squad.findAll({
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

  const existing = await Squad.findOne({ where: { cohort_id: cohortId, number: data.number } });
  if (existing) throw new AppError(`Squad ${data.number} already exists in this cohort`, 409, 'CONFLICT');

  return Squad.create({ ...data, cohort_id: cohortId });
}

async function update(squadId, data) {
  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');
  return squad.update(data);
}

async function remove(squadId) {
  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');
  await Enrollment.update({ cell_id: null }, { where: { cell_id: squadId } });
  await squad.destroy();
}

async function assignMember(squadId, userId) {
  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, cohort_id: squad.cohort_id } });
  if (!enrollment) throw new AppError('User is not enrolled in this cohort', 400, 'NOT_ENROLLED');

  await Enrollment.update(
    { cell_id: null },
    { where: { user_id: userId, cohort_id: squad.cohort_id, cell_id: { [require('sequelize').Op.ne]: null } } }
  );

  await enrollment.update({ cell_id: squadId });
  return listByCohort(squad.cohort_id);
}

async function removeMember(squadId, userId) {
  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, cell_id: squadId } });
  if (!enrollment) throw new NotFoundError('Squad member');

  await enrollment.update({ cell_id: null });
}

module.exports = { listByCohort, create, update, remove, assignMember, removeMember };
