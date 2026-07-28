'use strict';
const tacticalSpecialistService = require('../services/tacticalSpecialist.service');

async function chat(req, res, next) {
  try {
    const { history, message } = req.body;
    const result = await tacticalSpecialistService.chat(req.params.aid, history, message);
    return res.status(201).json(result);
  } catch (err) { return next(err); }
}

module.exports = { chat };
