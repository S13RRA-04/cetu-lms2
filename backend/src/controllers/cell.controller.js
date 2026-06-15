'use strict';
const cellService = require('../services/cell.service');

async function listByCohort(req, res, next) {
  try { res.json(await cellService.listByCohort(req.params.cid)); }
  catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await cellService.create(req.params.cid, req.body)); }
  catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await cellService.update(req.params.sid, req.body)); }
  catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { await cellService.remove(req.params.sid); res.status(204).end(); }
  catch (err) { next(err); }
}

async function assignMember(req, res, next) {
  try { res.json(await cellService.assignMember(req.params.sid, req.body.user_id)); }
  catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try { await cellService.removeMember(req.params.sid, req.params.uid); res.status(204).end(); }
  catch (err) { next(err); }
}

module.exports = { listByCohort, create, update, remove, assignMember, removeMember };
