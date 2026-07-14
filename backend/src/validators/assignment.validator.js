'use strict';
const Joi = require('joi');

const TYPES = ['module', 'game', 'assessment', 'survey', 'challenge', 'capstone'];

const createAssignmentSchema = Joi.object({
  title:        Joi.string().max(255).required(),
  description:  Joi.string().allow('', null),
  launch_briefing: Joi.string().allow('', null),
  debrief:      Joi.string().allow('', null),
  max_score:    Joi.number().positive().default(100),
  due_date:     Joi.date().iso().allow(null),
  is_published: Joi.boolean().default(false),
  type:         Joi.string().valid(...TYPES).default('module'),
  grading_mode: Joi.string().valid('individual', 'squad').default('individual'),
  order_index:  Joi.number().integer().min(0).default(0),
  questions:    Joi.array().default([]),
});

const updateAssignmentSchema = Joi.object({
  title:        Joi.string().max(255),
  description:  Joi.string().allow('', null),
  launch_briefing: Joi.string().allow('', null),
  debrief:      Joi.string().allow('', null),
  max_score:    Joi.number().positive(),
  due_date:     Joi.date().iso().allow(null),
  is_published: Joi.boolean(),
  type:         Joi.string().valid(...TYPES),
  grading_mode: Joi.string().valid('individual', 'squad'),
  order_index:  Joi.number().integer().min(0),
  questions:    Joi.array(),
  drop_number:   Joi.number().integer().min(1).max(10).allow(null),
  scenario_name: Joi.string().max(255).allow('', null),
  victim_name:   Joi.string().max(255).allow('', null),
}).min(1);

const gradeSchema = Joi.object({
  score:        Joi.number().min(0).required(),
  feedback:     Joi.string().allow('', null),
  promptScores: Joi.object().pattern(Joi.string(), Joi.alternatives().try(
    Joi.number().min(0),
    Joi.object({
      score: Joi.number().min(0).required(),
      maxScore: Joi.number().positive().required(),
      criteria: Joi.array().items(Joi.boolean()).required(),
    })
  )).allow(null),
}).custom((value, helpers) => {
  if (!value.promptScores) return value;
  let total = 0;
  for (const prompt of Object.values(value.promptScores)) {
    if (typeof prompt === 'number') { total += prompt; continue; }
    if (prompt.criteria.length === 0) return helpers.error('any.invalid');
    const base = Math.floor((prompt.maxScore * 100) / prompt.criteria.length) / 100;
    const points = prompt.criteria.map((_, i) => i === prompt.criteria.length - 1
      ? Number((prompt.maxScore - base * (prompt.criteria.length - 1)).toFixed(2))
      : base);
    const expected = prompt.criteria.reduce((sum, selected, i) => sum + (selected ? points[i] : 0), 0);
    if (Math.abs(prompt.score - expected) > 0.011) return helpers.error('any.invalid');
    total += prompt.score;
  }
  if (Math.abs(value.score - total) > 0.011) return helpers.error('any.invalid');
  return value;
}, 'prompt score consistency');

const unlockSchema = Joi.object({
  cohort_id: Joi.string().uuid().required(),
  squad_id:  Joi.string().uuid().allow(null).optional(),
});

module.exports = { createAssignmentSchema, updateAssignmentSchema, gradeSchema, unlockSchema };
