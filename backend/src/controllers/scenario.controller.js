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
    const isAdmin = req.user.role !== 'student';
    const result  = isAdmin
      ? await scenarioService.getFilesAdmin(req.params.sid)
      : await scenarioService.getDownloadUrl(req.params.sid, req.user.id);
    return res.json(result);
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

/* GET /:id/scenarios/browse?prefix=scenarios/my-scenario/ */
async function browse(req, res, next) {
  try {
    const { R2_DECKS_PREFIX } = require('../config/r2');
    const rawPrefix = req.query.prefix;
    const prefix    = (rawPrefix != null) ? rawPrefix : R2_DECKS_PREFIX;
    return res.json(await scenarioService.browseR2(prefix));
  } catch (err) {
    console.error('[R2 browse] prefix=%s error=%s', req.query.prefix ?? '(none)', err.message);
    if (err.message?.includes('credential') || err.name === 'CredentialsProviderError') {
      return res.status(503).json({ error: 'R2 credentials are not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in the server environment.' });
    }
    return next(err);
  }
}

/* POST /:id/scenarios/presign  { key, content_type } */
async function presignUpload(req, res, next) {
  try {
    const { key, content_type } = req.body ?? {};
    if (!key) return res.status(400).json({ error: 'key is required' });
    return res.json(await scenarioService.getPresignedUploadUrl(key, content_type));
  } catch (err) { return next(err); }
}

/* DELETE /:id/scenarios/r2-object  { key } */
async function deleteR2Object(req, res, next) {
  try {
    const { key } = req.body ?? {};
    if (!key) return res.status(400).json({ error: 'key is required' });
    await scenarioService.deleteR2Object(key);
    return res.status(204).end();
  } catch (err) { return next(err); }
}

/* POST /:id/scenarios/quick-release  { cohort_id, r2_key, title, scenario_name, squad_number } */
async function quickRelease(req, res, next) {
  try {
    const { cohort_id, r2_key, title, scenario_name, squad_number } = req.body ?? {};
    if (!cohort_id || !r2_key) {
      return res.status(400).json({ error: 'cohort_id and r2_key are required' });
    }
    const pkg = await scenarioService.quickRelease(
      req.params.id,
      cohort_id,
      { r2_key, title, scenario_name, squad_number, unlocker_id: req.user.id },
    );
    return res.status(201).json(pkg);
  } catch (err) { return next(err); }
}

module.exports = {
  list, getDownloadUrl, create, update, remove,
  unlockForCohort, lockForCohort,
  browse, presignUpload, deleteR2Object, quickRelease,
};
