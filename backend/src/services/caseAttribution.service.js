'use strict';
const { CaseAttributionAssessment, CaseEntity } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');

/**
 * Attribution workspace (design brief §14). Deliberately NOT a single
 * AI-generated confidence percentage — attribution is tracked as a set of
 * independent dimensions, each rated by the squad itself and required to
 * cite real evidence ids, with gaps surfaced explicitly rather than hidden
 * behind an aggregate score.
 */
const DIMENSIONS = [
  'technical', 'infrastructure', 'identity', 'behavioral',
  'financial', 'device', 'account', 'intelligence', 'corroboration',
];

const RATINGS = ['none', 'weak', 'moderate', 'strong'];

function emptyDimension() {
  return { rating: 'none', supporting_evidence_ids: [], notes: '' };
}

/**
 * Pure — no DB. Never collapses to a single number: reports which
 * dimensions are still unassessed or weak, so the gap itself is what's
 * shown, not a score that papers over it.
 */
function summarizeGaps(dimensions) {
  const unassessed = [];
  const weak = [];
  const corroborated = [];

  for (const key of DIMENSIONS) {
    const d = dimensions[key] ?? emptyDimension();
    if (d.rating === 'none') unassessed.push(key);
    else if (d.rating === 'weak') weak.push(key);
    else if ((d.supporting_evidence_ids || []).length === 0) weak.push(key); // rated but uncited — treat as weak, not trusted
    else corroborated.push(key);
  }

  let readiness = 'insufficient';
  if (corroborated.length >= DIMENSIONS.length - 1) readiness = 'substantial';
  else if (corroborated.length >= 3) readiness = 'developing';

  return { unassessed, weak, corroborated, readiness };
}

async function get(caseId, squadId, subjectEntityId) {
  const subject = await CaseEntity.findOne({ where: { id: subjectEntityId, case_id: caseId } });
  if (!subject) throw new NotFoundError('Subject entity');

  const [assessment] = await CaseAttributionAssessment.findOrCreate({
    where: { case_id: caseId, squad_id: squadId, subject_entity_id: subjectEntityId },
    defaults: { case_id: caseId, squad_id: squadId, subject_entity_id: subjectEntityId, dimensions: {} },
  });
  return { assessment, gaps: summarizeGaps(assessment.dimensions || {}) };
}

async function listForSquad(caseId, squadId) {
  return CaseAttributionAssessment.findAll({ where: { case_id: caseId, squad_id: squadId }, include: [{ model: CaseEntity, as: 'subjectEntity' }] });
}

async function updateDimension(caseId, squadId, subjectEntityId, dimensionKey, data, userId) {
  if (!DIMENSIONS.includes(dimensionKey)) throw new AppError(`Unknown attribution dimension: ${dimensionKey}`, 422, 'VALIDATION_ERROR');
  const rating = data?.rating ?? 'none';
  if (!RATINGS.includes(rating)) throw new AppError(`Invalid rating: ${rating}`, 422, 'VALIDATION_ERROR');

  const { assessment } = await get(caseId, squadId, subjectEntityId);
  if (assessment.squad_id !== squadId) throw new ForbiddenError();

  const dimensions = { ...(assessment.dimensions || {}) };
  dimensions[dimensionKey] = {
    rating,
    supporting_evidence_ids: Array.isArray(data?.supporting_evidence_ids) ? data.supporting_evidence_ids : [],
    notes: data?.notes ?? '',
  };

  await assessment.update({ dimensions, updated_by: userId });
  return { assessment, gaps: summarizeGaps(dimensions) };
}

module.exports = { DIMENSIONS, RATINGS, summarizeGaps, get, listForSquad, updateDimension };
