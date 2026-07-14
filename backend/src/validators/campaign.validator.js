'use strict';

const Joi = require('joi');

const fields = {
  number: Joi.number().integer().min(1).max(32767),
  title: Joi.string().trim().max(255),
  scenario_name: Joi.string().trim().max(255).allow('', null),
  narrative_intro: Joi.string().trim().allow('', null),
  vault_hint: Joi.string().trim().allow('', null),
  vault_pin: Joi.string().trim().max(64).allow('', null),
  html_signal: Joi.string().trim().max(128).allow('', null),
  signal_prompt: Joi.string().trim().allow('', null),
};

const matchingVaultFields = (value, helpers) => {
  const hasInstructions = typeof value.vault_hint === 'string' && value.vault_hint.trim().length > 0;
  const hasAnswer = typeof value.vault_pin === 'string' && value.vault_pin.trim().length > 0;
  const clearsBoth = [value.vault_hint, value.vault_pin].every((field) => field === null || field === '' || field === undefined);
  if (!clearsBoth && hasInstructions !== hasAnswer) {
    return helpers.message({ custom: 'Vault Lock requires both vault_hint and vault_pin' });
  }
  return value;
};

const createCampaignDropSchema = Joi.object({
  ...fields,
  number: fields.number.required(),
  title: fields.title.required(),
}).custom(matchingVaultFields);

const updateCampaignDropSchema = Joi.object(fields).min(1);

const verifyVaultPinSchema = Joi.object({
  pin: Joi.string().trim().max(64).required(),
});

module.exports = { createCampaignDropSchema, updateCampaignDropSchema, verifyVaultPinSchema };
