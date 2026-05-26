'use strict';
const ltiService           = require('../services/lti.service');
const { LtiToolRegistration } = require('../models');
const { NotFoundError }    = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listPlatforms(req, res, next) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const { rows, count } = await LtiToolRegistration.findAndCountAll({ limit, offset, order: [['created_at', 'DESC']] });
    return res.json(paginatedResponse(rows, count, { page, limit }));
  } catch (err) { return next(err); }
}

async function createPlatform(req, res, next) {
  try {
    const reg = await ltiService.registerPlatform(req.body);
    return res.status(201).json(reg);
  } catch (err) { return next(err); }
}

async function updatePlatform(req, res, next) {
  try {
    const reg = await LtiToolRegistration.findByPk(req.params.id);
    if (!reg) return next(new NotFoundError('Platform registration'));
    await reg.update(req.body);
    return res.json(reg);
  } catch (err) { return next(err); }
}

async function deletePlatform(req, res, next) {
  try {
    await ltiService.deactivatePlatform(req.params.id);
    return res.status(204).send();
  } catch (err) { return next(err); }
}

module.exports = { listPlatforms, createPlatform, updatePlatform, deletePlatform };
