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
