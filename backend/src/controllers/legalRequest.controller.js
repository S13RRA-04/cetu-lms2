'use strict';
const legalRequestService = require('../services/legalRequest.service');

async function list(req, res, next) {
  try { return res.json(await legalRequestService.getForStudent(req.params.aid, req.user.id)); }
  catch (err) { return next(err); }
}

async function submit(req, res, next) {
  try {
    const { message, requestId, requestType } = req.body;
    const request = await legalRequestService.submitOrContinue(req.params.aid, req.user.id, requestId ?? null, message, requestType);
    return res.status(201).json(request);
  } catch (err) { return next(err); }
}

module.exports = { list, submit };
