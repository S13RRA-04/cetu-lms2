'use strict';
const svc = require('../services/squadChallengeState.service');

async function getState(req, res, next) {
  try {
    const state = await svc.getState(req.params.id, req.params.aid, req.user.id);
    return res.json(state);
  } catch (err) { return next(err); }
}

async function saveState(req, res, next) {
  try {
    const state = await svc.saveState(req.params.id, req.params.aid, req.user.id, req.body ?? {});
    return res.json(state);
  } catch (err) { return next(err); }
}

module.exports = { getState, saveState };
