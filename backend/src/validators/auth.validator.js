'use strict';
const Joi = require('joi');

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     Joi.string().min(8).required(),
});

const registerSchema = Joi.object({
  email:      Joi.string().email().required(),
  username:   Joi.string().alphanum().min(3).max(100).required(),
  password:   Joi.string().min(8).required(),
  first_name: Joi.string().max(100).required(),
  last_name:  Joi.string().max(100).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordWithTokenSchema = Joi.object({
  token:        Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

module.exports = {
  loginSchema, changePasswordSchema, registerSchema,
  forgotPasswordSchema, resetPasswordWithTokenSchema,
};
