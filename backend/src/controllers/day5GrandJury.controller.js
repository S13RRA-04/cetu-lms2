'use strict';
const day5GrandJuryService = require('../services/day5GrandJury.service');
const { ValidationError } = require('../utils/errors');

async function getStatus(req, res, next) {
  try {
    if (!req.query.cohort_id) throw new ValidationError('cohort_id is required');
    return res.json(await day5GrandJuryService.getStatus(req.params.id, req.query.cohort_id));
  } catch (err) { return next(err); }
}

async function release(req, res, next) {
  try {
    if (!req.body.cohort_id) throw new ValidationError('cohort_id is required');
    return res.json(await day5GrandJuryService.release(
      req.params.id, req.body.cohort_id, req.body.search_by_squad ?? {}, req.user.id,
    ));
  } catch (err) { return next(err); }
}

module.exports = { getStatus, release };
