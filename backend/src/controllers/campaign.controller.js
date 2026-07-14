'use strict';
const campaignService = require('../services/campaign.service');

async function listDrops(req, res, next) {
  try {
    const cohortId = req.query.cohort_id ?? null;
    const isStaff  = ['admin', 'superadmin', 'instructor'].includes(req.user?.role);
    res.json(await campaignService.listDrops(req.params.id, cohortId, isStaff));
  } catch (err) { next(err); }
}

async function verifyVaultPin(req, res, next) {
  try {
    const { valid } = await campaignService.verifyVaultPin(req.params.did, req.body.pin ?? '');
    res.json({ valid });
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
    const result = await campaignService.lockDrop(req.params.did, req.body.cohort_id, {
      revokeRelated: req.body.revoke_related === true,
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function previewRelease(req, res, next) {
  try { res.json(await campaignService.previewRelease(req.params.did, req.query.cohort_id)); }
  catch (err) { next(err); }
}

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, previewRelease, releaseDrop, lockDrop, verifyVaultPin };
