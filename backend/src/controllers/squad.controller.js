'use strict';
const squadService = require('../services/squad.service');

async function listByCohort(req, res, next) {
  try { res.json(await squadService.listByCohort(req.params.cid)); }
  catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await squadService.create(req.params.cid, req.body)); }
  catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await squadService.update(req.params.sid, req.body)); }
  catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { await squadService.remove(req.params.sid); res.status(204).end(); }
  catch (err) { next(err); }
}

async function assignMember(req, res, next) {
  try { res.json(await squadService.assignMember(req.params.sid, req.body.user_id)); }
  catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try { await squadService.removeMember(req.params.sid, req.params.uid); res.status(204).end(); }
  catch (err) { next(err); }
}

async function announceWheelWinner(req, res, next) {
  try {
    await squadService.announceWheelWinner(req.params.sid, { userId: req.body.user_id, name: req.body.name });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listByCohort, create, update, remove, assignMember, removeMember, announceWheelWinner };
