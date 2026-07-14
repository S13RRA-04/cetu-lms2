'use strict';

const Joi = require('joi');

const syncDropCaseFilesSchema = Joi.object({
  scenario_name: Joi.string().trim().max(255),
  drop_number: Joi.number().integer().min(1).max(32767),
}).and('scenario_name', 'drop_number');

module.exports = { syncDropCaseFilesSchema };
