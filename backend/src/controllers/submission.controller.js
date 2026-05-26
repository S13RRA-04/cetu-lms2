'use strict';
const submissionService = require('../services/submission.service');

async function listByAssignment(req, res, next) {
  try { return res.json(await submissionService.listByAssignment(req.params.aid)); }
  catch (err) { return next(err); }
}

async function getMine(req, res, next) {
  try {
    const sub = await submissionService.getMySubmission(req.params.aid, req.user.id);
    return res.json(sub || null);
  } catch (err) { return next(err); }
}

async function submit(req, res, next) {
  try {
    const result = await submissionService.submit(req.params.aid, req.user.id, req.body.content);
    return res.status(201).json(result);
  } catch (err) { return next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const result = await submissionService.updateStatus(req.params.sid, req.body.status);
    return res.json(result);
  } catch (err) { return next(err); }
}

module.exports = { listByAssignment, getMine, submit, updateStatus };
