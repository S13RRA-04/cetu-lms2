'use strict';
const svc = require('../services/courseContent.service');

async function list(req, res, next) {
  try {
    const data = req.user.role === 'student'
      ? await svc.listForStudent(req.params.id, req.user.id)
      : await svc.listForAdmin(req.params.id);
    return res.json(data);
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try {
    /* file upload: raw body set by express.raw() middleware */
    const isUpload   = Buffer.isBuffer(req.body);
    const fileBuffer = isUpload ? req.body : null;
    const fileName   = isUpload ? (req.headers['x-file-name'] ?? 'upload.bin') : null;
    const mimeType   = isUpload ? req.headers['content-type'] : null;
    /* JSON metadata comes from query params when uploading binary */
    const meta = isUpload ? req.query : req.body;
    const item = await svc.create(req.params.id, meta, fileBuffer, fileName, mimeType);
    return res.status(201).json(item);
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try { return res.json(await svc.update(req.params.cid, req.body)); }
  catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try { await svc.remove(req.params.cid); return res.status(204).send(); }
  catch (err) { return next(err); }
}

async function unlockForCohort(req, res, next) {
  try {
    const unlock = await svc.unlockForCohort(req.params.cid, req.body.cohort_id, req.user.id);
    return res.status(201).json(unlock);
  } catch (err) { return next(err); }
}

async function lockForCohort(req, res, next) {
  try {
    await svc.lockForCohort(req.params.cid, req.body.cohort_id);
    return res.status(204).end();
  } catch (err) { return next(err); }
}

module.exports = { list, create, update, remove, unlockForCohort, lockForCohort };
