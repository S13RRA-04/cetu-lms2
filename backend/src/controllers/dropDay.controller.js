'use strict';
const dropDayService = require('../services/dropDay.service');

async function list(req, res, next) {
  try { return res.json(await dropDayService.list(req.params.id)); }
  catch (err) { return next(err); }
}

async function set(req, res, next) {
  try { return res.json(await dropDayService.set(req.params.id, req.body)); }
  catch (err) { return next(err); }
}

module.exports = { list, set };
