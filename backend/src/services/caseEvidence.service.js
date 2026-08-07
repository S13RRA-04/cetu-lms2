'use strict';
const { CaseEvidence } = require('../models');
const aiProvider = require('./ai/aiProvider');
const caseEngine = require('./caseEngine.service');

const ARTIFACT_SYSTEM_PROMPT =
  'You render authoritative case facts as a realistic investigative-return document (e.g. a subpoena return, ' +
  'financial statement, forensic report). Use ONLY the facts provided — never add names, dates, amounts, or ' +
  'events not present in the facts. Format it as the source type would realistically appear (letterhead-style ' +
  'header, plain fielded text, or short report — whatever fits the source type). Keep it under 300 words.';

/**
 * Renders `authoritative_facts` into realistic document text via the AI
 * provider exactly once, then persists the result — repeat views return the
 * cached text so the same facts never produce a different-looking artifact
 * on a second call (design brief §11: reproducibility).
 */
async function renderArtifact(evidence) {
  if (evidence.rendered_artifact) return evidence.rendered_artifact;

  const factsPrompt =
    `Source type: ${evidence.source_type}\n` +
    `Facts (JSON):\n${JSON.stringify(evidence.authoritative_facts, null, 2)}\n` +
    (evidence.artifact_template ? `\nTemplate/format guidance:\n${evidence.artifact_template}` : '');

  const rendered = await aiProvider.generateArtifact(ARTIFACT_SYSTEM_PROMPT, factsPrompt, { maxTokens: 600 });
  await evidence.update({ rendered_artifact: rendered });
  return rendered;
}

/** Evidence a squad has actually discovered, with rendered artifacts attached. */
async function getDiscoveredEvidence(caseId, squadId) {
  const state = await caseEngine.getState(caseId, squadId);
  const discoveredIds = state.discovered_evidence_ids || [];
  if (discoveredIds.length === 0) return [];

  const rows = await CaseEvidence.findAll({ where: { case_id: caseId, id: discoveredIds } });
  return Promise.all(rows.map(async (ev) => ({
    id: ev.id,
    evidence_key: ev.evidence_key,
    source_type: ev.source_type,
    reliability: ev.reliability,
    related_entity_ids: ev.related_entity_ids,
    artifact: await renderArtifact(ev),
  })));
}

module.exports = { renderArtifact, getDiscoveredEvidence };
