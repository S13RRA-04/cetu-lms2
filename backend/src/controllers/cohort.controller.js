'use strict';
const cohortService = require('../services/cohort.service');

async function listByCourse(req, res, next) {
  try {
    const cohorts = await cohortService.listByCourse(req.params.id);
    res.json(cohorts);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const cohort = await cohortService.getById(req.params.cid);
    res.json(cohort);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const cohort = await cohortService.create(req.params.id, req.body);
    res.status(201).json(cohort);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const cohort = await cohortService.update(req.params.cid, req.body);
    res.json(cohort);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await cohortService.remove(req.params.cid);
    res.status(204).end();
  } catch (err) { next(err); }
}

async function addMember(req, res, next) {
  try {
    const cohort = await cohortService.addMember(req.params.cid, req.body.user_id);
    res.json(cohort);
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    await cohortService.removeMember(req.params.cid, req.params.uid);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listByCourse, getOne, create, update, remove, addMember, removeMember };
