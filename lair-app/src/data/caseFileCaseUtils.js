/*
  Case File — case-agnostic helpers shared by every case module under
  ./cases/*.js. A "case data" object is the shape each of those files
  exports: { caseMeta, centralFacts, factMatrix, evidenceCards,
  evidenceByThreshold, legalRouting, grandJuryRubric, outcomeTiers,
  victoryConditions, failureConditions, defenseCounterplayCards }.

  Case Strength bands (Intake/Relevance/.../Beyond a Reasonable Doubt) are
  a fixed base-game constant, not case-specific, so they live here once
  rather than being duplicated per case.
*/

import { POSITIVE_INJECTS, NEGATIVE_INJECTS } from './caseFileInjectDecks.js';
import { referenceCardById } from './caseFileEvidenceDeck.js';

export const positiveInjectFlavor = POSITIVE_INJECTS;
export const negativeInjectFlavor = NEGATIVE_INJECTS;

/**
 * An evidenceCards entry either authors `name` inline (every card in the 3
 * existing cases) or opts into the case-agnostic Evidence Card Reference via
 * `ref` (see caseFileEvidenceDeck.js) and leaves `name` unset.
 */
function resolveCardName(entry) {
  if (!entry.ref) return entry.name;
  return referenceCardById(entry.category, entry.ref)?.name ?? entry.ref;
}

/**
 * Four-tier narrative system: an entry either authors a single static
 * `flavor` (every card in the 3 existing cases — shown regardless of the
 * card's development tier, exactly as today) or opts in with a `tiers`
 * array of `{ tier, narrative_entry }` (1-indexed, contiguous from 1 — see
 * caseFileEvidenceDeck.js for the tier/max_tier numbering). Returns the
 * highest authored tier at or below `tierNumber`, so a card whose current
 * tier has outrun its authored entries still shows its last available one
 * rather than nothing.
 */
function resolveCardNarrative(entry, tierNumber) {
  if (!entry.tiers?.length) return entry.flavor;
  const usable = entry.tiers.filter((t) => t.tier <= tierNumber);
  if (!usable.length) return entry.flavor;
  return usable.reduce((a, b) => (b.tier > a.tier ? b : a)).narrative_entry;
}

/**
 * The ceiling on how many tiers this specific card can narratively support.
 * An authored `tiers` array is authoritative. A `ref`-based card without its
 * own `tiers` falls back to the Evidence Card Reference's ceiling for that
 * card type. A fully legacy inline card (no `tiers`, no `ref`) returns 4 —
 * no new restriction, preserving today's Develop behavior exactly for the 3
 * existing cases.
 */
function resolveMaxTier(entry) {
  if (entry.tiers?.length) return entry.tiers.length;
  if (entry.ref) return referenceCardById(entry.category, entry.ref)?.maxTier ?? 4;
  return 4;
}

const BAND_THRESHOLDS = [
  { key: 'intake', label: 'Intake', min: 0, max: 4 },
  { key: 'relevance', label: 'Relevance', min: 5, max: 10 },
  { key: 'specific_and_articulable_facts', label: 'Specific & Articulable Facts', min: 11, max: 15 },
  { key: 'probable_cause', label: 'Probable Cause', min: 16, max: 20 },
  { key: 'beyond_a_reasonable_doubt', label: 'Beyond a Reasonable Doubt', min: 21, max: Infinity },
];

export function bandForCaseStrength(caseStrength) {
  return BAND_THRESHOLDS.find((b) => caseStrength >= b.min && caseStrength <= b.max) ?? BAND_THRESHOLDS[0];
}

export { BAND_THRESHOLDS };

/** caseDefiningDevelopments derived straight from a case's evidenceCards. */
export function caseDefiningDevelopments(caseData) {
  return caseData.evidenceCards
    .filter((c) => c.caseDefining)
    .map((c) => ({ cardId: c.id, name: resolveCardName(c) }));
}

/** Deck payload — grouped card IDs, ready for coordinator.createSession() via the WS `join` message. */
export function buildDeckPayload(caseData) {
  const decks = { interviews: [], documents: [], digital: [], physical: [], financial: [], intelligence: [] };
  for (const card of caseData.evidenceCards) decks[card.category].push(card.id);
  return {
    decks,
    positiveInjectIds: positiveInjectFlavor.map((_, i) => `pos-${i + 1}`),
    negativeInjectIds: negativeInjectFlavor.map((_, i) => `neg-${i + 1}`),
    defenseCounterplayIds: caseData.defenseCounterplayCards.map((c) => c.id),
    consolidateCap: 8,
  };
}

/**
 * `tierNumber` (1-4, default 1) selects which of a card's tiered narrative
 * entries to surface as `.flavor` — see resolveCardNarrative(). Pass the
 * card's current resolvedEvidence tier (via caseFileTheme.js's
 * TIER_NUMBER[e.tier]) when displaying it; callers that only need `.name`
 * or `.maxTier` can omit it.
 */
export function findCard(caseData, cardId, tierNumber = 1) {
  const entry = caseData.evidenceCards.find((c) => c.id === cardId);
  if (!entry) return null;
  return { ...entry, name: resolveCardName(entry), flavor: resolveCardNarrative(entry, tierNumber), maxTier: resolveMaxTier(entry) };
}

export function findFact(caseData, factId) {
  return caseData.centralFacts.find((f) => f.id === factId) ?? null;
}

export function findDefenseCard(caseData, cardId) {
  return caseData.defenseCounterplayCards.find((c) => c.id === cardId) ?? null;
}

export function positiveInjectById(id) {
  const idx = Number(String(id).split('-')[1]) - 1;
  return positiveInjectFlavor[idx] ?? null;
}

export function negativeInjectById(id) {
  const idx = Number(String(id).split('-')[1]) - 1;
  return negativeInjectFlavor[idx] ?? null;
}
