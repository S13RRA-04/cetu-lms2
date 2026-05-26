'use strict';
const enrollmentService = require('../services/enrollment.service');

async function listByCourse(req, res, next) {
  try { return res.json(await enrollmentService.listByCourse(req.params.id)); }
  catch (err) { return next(err); }
}

async function enroll(req, res, next) {
  try {
    // Admin/instructor can enroll any user; students enroll themselves
    const userId = req.body.user_id || req.user.id;
    const role   = req.body.role    || 'student';
    const result = await enrollmentService.enroll(req.params.id, userId, role);
    return res.status(201).json(result);
  } catch (err) { return next(err); }
}

async function updateEnrollment(req, res, next) {
  try { return res.json(await enrollmentService.updateEnrollment(req.params.id, req.params.uid, req.body)); }
  catch (err) { return next(err); }
}

async function unenroll(req, res, next) {
  try { return res.json(await enrollmentService.unenroll(req.params.id, req.params.uid)); }
  catch (err) { return next(err); }
}

module.exports = { listByCourse, enroll, updateEnrollment, unenroll };
