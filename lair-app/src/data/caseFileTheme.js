/*
  Shared visual theme for the Case File board — category colors/icons and
  Case Strength band colors, matching the physical game's card-back art
  (see project docs: the ChatGPT-generated evidence-deck reference sheets).
  Used by both CaseFileFacilitator.jsx and CaseFilePlayer.jsx so the two
  screens read as the same physical board.
*/

export const CATEGORY_META = {
  interviews: { label: 'Interviews', color: '#a855f7', icon: '💬' },
  documents: { label: 'Documents', color: '#d99a2b', icon: '📁' },
  digital: { label: 'Digital', color: '#3b82f6', icon: '💻' },
  physical: { label: 'Physical', color: '#e0592b', icon: '🖐' },
  financial: { label: 'Financial', color: '#2f9e6e', icon: '$' },
  intelligence: { label: 'Intelligence', color: '#d43b3b', icon: '🌐' },
};

export const CATEGORIES = Object.keys(CATEGORY_META);

export const BAND_META = {
  intake: { color: '#8a8f98' },
  relevance: { color: '#33ff5e' },
  specific_and_articulable_facts: { color: '#d9c02b' },
  probable_cause: { color: '#e0822b' },
  beyond_a_reasonable_doubt: { color: '#e03b3b' },
};

export const PRESSURE_META = {
  green: { color: '#33ff5e', label: 'Green' },
  yellow: { color: '#d9c02b', label: 'Yellow' },
  orange: { color: '#e0822b', label: 'Orange' },
  red: { color: '#e0453b', label: 'Red' },
  black: { color: '#8888a0', label: 'Black' },
};
export const PRESSURE_LEVELS = Object.keys(PRESSURE_META);

// Legal Instrument Ladder: tier -> { label, delay, minCaseStrength } per the Rulebook.
export const LADDER = {
  subpoena: { label: 'Subpoena', delay: 1, minCaseStrength: 5 },
  court_order: { label: 'Court Order', delay: 2, minCaseStrength: 11 },
  search_warrant: { label: 'Search Warrant', delay: 3, minCaseStrength: 16 },
};
export const NEXT_TIER = { discovered: 'subpoena', subpoena: 'court_order', court_order: 'search_warrant' };
export const TIER_RANK = { discovered: 0, subpoena: 1, court_order: 2, search_warrant: 3 };
// Same 4 states as TIER_RANK, 1-indexed to match the four-tier evidence card
// narrative system's tier/max_tier numbering (and the physical card's four
// orientation states) — see caseFileEvidenceDeck.js and
// caseFileCaseUtils.js's resolveCardNarrative()/resolveMaxTier().
export const TIER_NUMBER = { discovered: 1, subpoena: 2, court_order: 3, search_warrant: 4 };

export function tierLabel(tier) {
  return tier === 'discovered' ? 'Discovered' : (LADDER[tier]?.label ?? tier);
}
