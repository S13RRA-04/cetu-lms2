'use strict';
const svc = require('../services/courseContent.service');

async function list(req, res, next) {
  try {
    const isStudent = req.user.role === 'student';
    const manage = !isStudent && req.query.manage === '1';
    if (manage) {
      // Command's authoring view — needs every item, locked or unlocked,
      // published or draft, across every squad, to manage release state.
      return res.json(await svc.listForAdmin(req.params.id, { includeUnpublished: true }));
    }
    // Plain Intel Library/Case File (CourseContentPage.jsx, ScenariosPage.jsx,
    // EvidenceDrawer.jsx — no `manage`): same fix as scenario.controller.js's
    // list() and for the same reason — listForAdmin has no squad/victim/role/
    // location scoping at all, so any staff role fell through to it and saw
    // every squad's content, including locked items with a still-populated
    // download_url the squad-scoped path would have nulled out. Students
    // keep their own-squad-scoped view; staff see everything released to
    // the active cohort, for any squad, but nothing that hasn't actually
    // been released yet.
    const data = isStudent
      ? await svc.listForStudent(req.params.id, req.user.id)
      : await svc.listForStaffView(req.params.id, req.user.id);
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
    const unlock = await svc.unlockForCohort(req.params.cid, req.body.cohort_id, req.user.id, req.body.squad_id ?? null);
    return res.status(201).json(unlock);
  } catch (err) { return next(err); }
}

async function lockForCohort(req, res, next) {
  try {
    await svc.lockForCohort(req.params.cid, req.body.cohort_id, req.body.squad_id ?? null);
    return res.status(204).end();
  } catch (err) { return next(err); }
}

async function download(req, res, next) {
  try {
    const url = await svc.getDownloadUrl(req.params.cid, req.user.id, req.user.role);
    return res.redirect(302, url);
  } catch (err) { return next(err); }
}

async function syncDecks(req, res, next) {
  try { return res.json(await svc.syncDecks(req.params.id)); }
  catch (err) { return next(err); }
}

async function syncDropCaseFiles(req, res, next) {
  try {
    return res.json(await svc.syncDropCaseFiles(req.params.id, {
      scenarioName: req.body.scenario_name,
      dropNumber: req.body.drop_number,
    }));
  }
  catch (err) { return next(err); }
}

module.exports = { list, create, update, remove, unlockForCohort, lockForCohort, download, syncDecks, syncDropCaseFiles };
