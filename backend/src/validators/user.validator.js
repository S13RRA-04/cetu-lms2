'use strict';
const Joi = require('joi');

// Keep in sync with enum_users_professional_role (see migrations
// 20240101000031, 20240101000058, 20240101000063).
const PROFESSIONAL_ROLES = [
  'special_agent',
  'intelligence_analyst',
  'operational_support_sos',
  'operational_support_da',
  'supervisory_special_agent',
  'supervisory_intelligence_analyst',
  'task_force_officer',
  'cyber_analyst',
  'digital_evidence_lead',
  'forensic_accountant',
];

// Keep in sync with pact-app/src/constants/certifications.js.
const CERTIFICATIONS = ['DExT', 'CART', 'DFE', 'crypto_forensics'];

const createUserSchema = Joi.object({
  email:      Joi.string().email().required(),
  username:   Joi.string().alphanum().min(3).max(100).required(),
  password:   Joi.string().min(8).required(),
  first_name: Joi.string().max(100).required(),
  last_name:  Joi.string().max(100).required(),
  role:       Joi.string().valid('admin', 'instructor', 'student').default('student'),
});

const updateUserSchema = Joi.object({
  first_name:        Joi.string().max(100),
  last_name:         Joi.string().max(100),
  role:              Joi.string().valid('admin', 'instructor', 'student'),
  is_active:         Joi.boolean(),
  professional_role: Joi.string().valid(...PROFESSIONAL_ROLES).allow(null),
  certifications:    Joi.array().items(Joi.string().valid(...CERTIFICATIONS)),
}).min(1);

// Self-service (PUT /users/me and the self-editing branch of PUT /users/:id)
// — deliberately excludes role and is_active. Those two fields must only be
// settable by an admin/superadmin (see restrictPrivilegedUserFields in
// middleware/auth.js) — without this split, any authenticated user could
// PUT their own record with { role: "admin" } and grant themselves full
// admin access, since Joi's stripUnknown only strips fields NOT in the
// schema, not fields that are present but shouldn't be settable by the caller.
const updateSelfSchema = Joi.object({
  first_name:        Joi.string().max(100),
  last_name:         Joi.string().max(100),
  professional_role: Joi.string().valid(...PROFESSIONAL_ROLES).allow(null),
  certifications:    Joi.array().items(Joi.string().valid(...CERTIFICATIONS)),
}).min(1);

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     Joi.string().min(8).required(),
});

// Admin-initiated reset — no current password required (the admin doesn't know it)
const resetPasswordSchema = Joi.object({
  new_password: Joi.string().min(8).required(),
});

module.exports = { createUserSchema, updateUserSchema, updateSelfSchema, changePasswordSchema, resetPasswordSchema, PROFESSIONAL_ROLES, CERTIFICATIONS };
