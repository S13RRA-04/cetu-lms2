'use strict';
const Joi = require('joi');

const createAssignmentSchema = Joi.object({
  title:        Joi.string().max(255).required(),
  description:  Joi.string().allow('', null),
  max_score:    Joi.number().positive().default(100),
  due_date:     Joi.date().iso().allow(null),
  is_published: Joi.boolean().default(false),
});

const updateAssignmentSchema = Joi.object({
  title:        Joi.string().max(255),
  description:  Joi.string().allow('', null),
  max_score:    Joi.number().positive(),
  due_date:     Joi.date().iso().allow(null),
  is_published: Joi.boolean(),
}).min(1);

const gradeSchema = Joi.object({
  score:    Joi.number().min(0).required(),
  feedback: Joi.string().allow('', null),
});

module.exports = { createAssignmentSchema, updateAssignmentSchema, gradeSchema };
