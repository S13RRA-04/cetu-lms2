'use strict';
const scenarioService = require('../services/scenario.service');

async function list(req, res, next) {
  try {
    const data = req.user.role === 'student'
      ? await scenarioService.listForStudent(req.params.id, req.user.id)
      : await scenarioService.listForAdmin(req.params.id);
    return res.json(data);
  } catch (err) { return next(err); }
}

async function getDownloadUrl(req, res, next) {
  try {
    const url = await scenarioService.getDownloadUrl(req.params.sid, req.user.id);
    return res.json({ url });
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { return res.status(201).json(await scenarioService.create(req.params.id, req.body)); }
  catch (err) { return next(err); }
}

async function update(req, res, next) {
  try { return res.json(await scenarioService.update(req.params.sid, req.body)); }
  catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try { await scenarioService.remove(req.params.sid); return res.status(204).send(); }
  catch (err) { return next(err); }
}

async function unlockForCohort(req, res, next) {
  try {
    const unlock = await scenarioService.unlockForCohort(req.params.sid, req.body.cohort_id, req.user.id);
    return res.status(201).json(unlock);
  } catch (err) { return next(err); }
}

async function lockForCohort(req, res, next) {
  try {
    await scenarioService.lockForCohort(req.params.sid, req.body.cohort_id);
    return res.status(204).end();
  } catch (err) { return next(err); }
}

module.exports = { list, getDownloadUrl, create, update, remove, unlockForCohort, lockForCohort };
