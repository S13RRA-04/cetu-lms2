'use strict';
const Joi = require('joi');

const createUserSchema = Joi.object({
  email:      Joi.string().email().required(),
  username:   Joi.string().alphanum().min(3).max(100).required(),
  password:   Joi.string().min(8).required(),
  first_name: Joi.string().max(100).required(),
  last_name:  Joi.string().max(100).required(),
  role:       Joi.string().valid('admin', 'instructor', 'student').default('student'),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name:  Joi.string().max(100),
  role:       Joi.string().valid('admin', 'instructor', 'student'),
  is_active:  Joi.boolean(),
}).min(1);

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     Joi.string().min(8).required(),
});

module.exports = { createUserSchema, updateUserSchema, changePasswordSchema };
