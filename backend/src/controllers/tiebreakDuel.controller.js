'use strict';
const tiebreakDuelService = require('../services/tiebreakDuel.service');
const { ValidationError } = require('../utils/errors');

async function getMine(req, res, next) {
  try {
    return res.json({ duel: await tiebreakDuelService.getForStudent(req.params.id, req.user.id) });
  } catch (err) { return next(err); }
}

async function getStatus(req, res, next) {
  try {
    if (!req.query.cohort_id) throw new ValidationError('cohort_id is required');
    return res.json(await tiebreakDuelService.getStatus(req.params.id, req.query.cohort_id, req.user.id));
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try {
    if (!req.body.cohort_id) throw new ValidationError('cohort_id is required');
    return res.status(201).json(await tiebreakDuelService.create(
      req.params.id, req.body.cohort_id, req.body.participant_ids ?? null, req.user.id,
    ));
  } catch (err) { return next(err); }
}

async function advance(req, res, next) {
  try { return res.json(await tiebreakDuelService.advance(req.params.id, req.params.did, req.user.id)); }
  catch (err) { return next(err); }
}

async function cancel(req, res, next) {
  try { return res.json(await tiebreakDuelService.cancel(req.params.id, req.params.did, req.user.id)); }
  catch (err) { return next(err); }
}

async function answer(req, res, next) {
  try {
    const round = Number(req.body.round);
    if (!Number.isInteger(round) || typeof req.body.choice !== 'string') throw new ValidationError('round and choice are required');
    return res.json(await tiebreakDuelService.answer(req.params.id, req.params.did, req.user.id, round, req.body.choice));
  } catch (err) { return next(err); }
}

module.exports = { getMine, getStatus, create, advance, cancel, answer };
