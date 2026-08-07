'use strict';
const { CaseHypothesis } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const aiProvider = require('./ai/aiProvider');

/**
 * Hypothesis CRUD plus a Socratic-challenge trigger (design brief §16).
 * Same declarative, first-unmet-rule-wins philosophy as
 * trainingAgent.service.js's HINT_RULES: the *content* of each challenge is
 * fixed, deterministic text keyed off real hypothesis fields — the model is
 * only asked to phrase that fixed content in an in-character, probing
 * tutor voice, never to invent the challenge itself.
 */
const SOCRATIC_TRIGGERS = [
  { id: 'no_contradicting_reviewed',
    check: (h) => (h.supporting_evidence_ids?.length ?? 0) > 0 && (h.contradicting_evidence_ids?.length ?? 0) === 0,
    prompt: 'What evidence would disprove this theory if it existed? Have you looked for it, or only for evidence that confirms it?' },
  { id: 'no_alternatives',
    check: (h) => (h.alternative_hypotheses?.length ?? 0) === 0,
    prompt: 'Could someone or something else explain this same evidence? Name at least one competing explanation before treating this as settled.' },
  { id: 'high_confidence_thin_evidence',
    check: (h) => (h.confidence ?? 0) >= 0.7 && (h.supporting_evidence_ids?.length ?? 0) < 2,
    prompt: 'This confidence level is high relative to how much independent evidence supports it. What would independently corroborate this beyond the single item you have?' },
  { id: 'unstated_assumptions',
    check: (h) => (h.assumptions?.length ?? 0) === 0,
    prompt: 'What are you assuming to be true here that hasn\'t actually been established by evidence yet?' },
];

function nextChallenge(hypothesis) {
  return SOCRATIC_TRIGGERS.find((t) => t.check(hypothesis)) ?? null;
}

async function list(caseId, squadId) {
  return CaseHypothesis.findAll({ where: { case_id: caseId, squad_id: squadId }, order: [['created_at', 'DESC']] });
}

async function create(caseId, squadId, userId, data) {
  if (!data?.statement || !data.statement.trim()) throw new AppError('statement is required', 422, 'VALIDATION_ERROR');
  return CaseHypothesis.create({
    case_id: caseId,
    squad_id: squadId,
    created_by: userId,
    statement: data.statement,
    supporting_evidence_ids: data.supporting_evidence_ids ?? [],
    contradicting_evidence_ids: data.contradicting_evidence_ids ?? [],
    assumptions: data.assumptions ?? [],
    alternative_hypotheses: data.alternative_hypotheses ?? [],
    open_questions: data.open_questions ?? [],
    confidence: data.confidence ?? null,
  });
}

/** Revising a hypothesis creates a new row and marks the prior one 'revised' — preserves history for the reasoning journal. */
async function revise(hypothesisId, squadId, userId, data) {
  const prior = await CaseHypothesis.findByPk(hypothesisId);
  if (!prior) throw new NotFoundError('Hypothesis');
  if (prior.squad_id !== squadId) throw new ForbiddenError();

  const revised = await CaseHypothesis.create({
    case_id: prior.case_id,
    squad_id: prior.squad_id,
    created_by: userId,
    revision_of: prior.id,
    statement: data.statement ?? prior.statement,
    supporting_evidence_ids: data.supporting_evidence_ids ?? prior.supporting_evidence_ids,
    contradicting_evidence_ids: data.contradicting_evidence_ids ?? prior.contradicting_evidence_ids,
    assumptions: data.assumptions ?? prior.assumptions,
    alternative_hypotheses: data.alternative_hypotheses ?? prior.alternative_hypotheses,
    open_questions: data.open_questions ?? prior.open_questions,
    confidence: data.confidence ?? prior.confidence,
  });

  prior.status = 'revised';
  await prior.save();
  return revised;
}

async function challenge(hypothesisId, squadId) {
  const hypothesis = await CaseHypothesis.findByPk(hypothesisId);
  if (!hypothesis) throw new NotFoundError('Hypothesis');
  if (hypothesis.squad_id !== squadId) throw new ForbiddenError();

  const trigger = nextChallenge(hypothesis);
  if (!trigger) {
    return { question: 'This hypothesis is well-corroborated with alternatives considered — keep testing it against new evidence as it arrives.' };
  }

  const systemPrompt =
    'You are a skeptical senior investigator reviewing a trainee\'s working theory. Deliver the following ' +
    'question in your own probing, professional words WITHOUT changing what it actually asks or adding new ' +
    `facts: "${trigger.prompt}" Keep it under 60 words, end with a question mark.`;
  const question = await aiProvider.generate(systemPrompt, [
    { role: 'user', content: `The current hypothesis is: "${hypothesis.statement}"` },
  ], { maxTokens: 150 });

  return { question, triggerId: trigger.id };
}

module.exports = { list, create, revise, challenge };
