'use strict';

const service = require('../services/preRangeBriefing.service');

async function get(req, res, next) {
  try { return res.json(await service.get(req.params.id, req.params.cid, req.user)); }
  catch (err) { return next(err); }
}

async function release(req, res, next) {
  try { return res.json(await service.release(req.params.id, req.params.cid, req.user.id)); }
  catch (err) { return next(err); }
}

async function lock(req, res, next) {
  try { return res.json(await service.lock(req.params.id, req.params.cid)); }
  catch (err) { return next(err); }
}

module.exports = { get, release, lock };
