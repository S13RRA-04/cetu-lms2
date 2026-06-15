'use strict';
const campaignService = require('../services/campaign.service');

async function listDrops(req, res, next) {
  try {
    // Students see drops with unlock status for their cohort
    const cohortId = req.query.cohort_id ?? null;
    res.json(await campaignService.listDrops(req.params.id, cohortId));
  } catch (err) { next(err); }
}

async function createDrop(req, res, next) {
  try { res.status(201).json(await campaignService.createDrop(req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function updateDrop(req, res, next) {
  try { res.json(await campaignService.updateDrop(req.params.did, req.body)); }
  catch (err) { next(err); }
}

async function deleteDrop(req, res, next) {
  try { await campaignService.deleteDrop(req.params.did); res.status(204).end(); }
  catch (err) { next(err); }
}

async function releaseDrop(req, res, next) {
  try {
    const result = await campaignService.releaseDrop(req.params.did, req.body.cohort_id, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
}

async function lockDrop(req, res, next) {
  try {
    await campaignService.lockDrop(req.params.did, req.body.cohort_id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, releaseDrop, lockDrop };
