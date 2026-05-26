'use strict';
const Joi = require('joi');

const createCourseSchema = Joi.object({
  title:         Joi.string().max(255).required(),
  description:   Joi.string().allow('', null),
  course_code:   Joi.string().max(50).required(),
  instructor_id: Joi.string().uuid().allow(null),
  status:        Joi.string().valid('draft', 'published', 'archived').default('draft'),
  thumbnail_url: Joi.string().uri().allow('', null),
  start_date:    Joi.date().iso().allow(null),
  end_date:      Joi.date().iso().min(Joi.ref('start_date')).allow(null),
});

const updateCourseSchema = Joi.object({
  title:         Joi.string().max(255),
  description:   Joi.string().allow('', null),
  course_code:   Joi.string().max(50),
  instructor_id: Joi.string().uuid().allow(null),
  status:        Joi.string().valid('draft', 'published', 'archived'),
  thumbnail_url: Joi.string().uri().allow('', null),
  start_date:    Joi.date().iso().allow(null),
  end_date:      Joi.date().iso().allow(null),
}).min(1);

const createModuleSchema = Joi.object({
  title:        Joi.string().max(255).required(),
  description:  Joi.string().allow('', null),
  order_index:  Joi.number().integer().min(0).default(0),
  is_published: Joi.boolean().default(false),
});

const updateModuleSchema = Joi.object({
  title:        Joi.string().max(255),
  description:  Joi.string().allow('', null),
  order_index:  Joi.number().integer().min(0),
  is_published: Joi.boolean(),
}).min(1);

module.exports = { createCourseSchema, updateCourseSchema, createModuleSchema, updateModuleSchema };
