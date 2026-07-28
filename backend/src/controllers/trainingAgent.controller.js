'use strict';
const trainingAgentService = require('../services/trainingAgent.service');

async function chat(req, res, next) {
  try {
    const { history, message } = req.body;
    const result = await trainingAgentService.chat(req.params.aid, req.user.id, history, message);
    return res.status(201).json(result);
  } catch (err) { return next(err); }
}

module.exports = { chat };
