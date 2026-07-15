'use strict';

const Joi = require('joi');

const PUZZLE_TYPES = ['cipher_wheel', 'log_grep', 'hash_match'];
const HASH_ALGORITHMS = ['md5', 'sha1', 'sha256'];

const fields = {
  puzzle_type: Joi.string().valid(...PUZZLE_TYPES),
  order_index: Joi.number().integer().min(0),
  enabled: Joi.boolean(),
  prompt: Joi.string().trim().allow('', null),
  answer: Joi.string().trim().max(255).allow('', null),
  config: Joi.object().unknown(true).default({}),
};

// Full "all required together" completeness check — real, per-type coverage
// (Signal Hunt has no equivalent anywhere in this codebase; this closes that
// gap for every new puzzle type instead of repeating it).
const perTypeConfigCheck = (value, helpers) => {
  const answer = typeof value.answer === 'string' ? value.answer.trim() : '';
  const config = value.config ?? {};

  if (value.puzzle_type === 'hash_match') {
    if (answer) return helpers.message({ custom: 'hash_match puzzles must not set answer — it is computed from config.inputText/config.algorithm' });
    if (!config.inputText || !String(config.inputText).trim()) return helpers.message({ custom: 'hash_match puzzles require config.inputText' });
    if (!HASH_ALGORITHMS.includes(config.algorithm)) return helpers.message({ custom: `hash_match puzzles require config.algorithm to be one of ${HASH_ALGORITHMS.join(', ')}` });
    return value;
  }

  if (!answer) return helpers.message({ custom: `${value.puzzle_type} puzzles require an answer` });
  if (value.puzzle_type === 'cipher_wheel' && (!config.cipherText || !String(config.cipherText).trim())) {
    return helpers.message({ custom: 'cipher_wheel puzzles require config.cipherText' });
  }
  if (value.puzzle_type === 'log_grep' && (!Array.isArray(config.logLines) || config.logLines.length === 0)) {
    return helpers.message({ custom: 'log_grep puzzles require a non-empty config.logLines array' });
  }
  return value;
};

const createPuzzleSchema = Joi.object({
  ...fields,
  puzzle_type: fields.puzzle_type.required(),
}).custom(perTypeConfigCheck);

// Deliberately no .custom() here — a PATCH-style update may only touch one
// field (e.g. just `enabled` or `order_index`). Real cross-field completeness
// enforcement on updates happens service-side against the merged record
// (assertCompletePuzzleConfig), same division of labor as campaign.validator.js
// uses for Vault Lock's create-vs-update split.
const updatePuzzleSchema = Joi.object(fields).min(1);

const verifyPuzzleSchema = Joi.object({
  answer: Joi.string().trim().max(1024).required(),
});

const reorderPuzzlesSchema = Joi.object({
  ordered_ids: Joi.array().items(Joi.string().uuid()).min(1).unique().required(),
});

module.exports = { createPuzzleSchema, updatePuzzleSchema, verifyPuzzleSchema, reorderPuzzlesSchema };
