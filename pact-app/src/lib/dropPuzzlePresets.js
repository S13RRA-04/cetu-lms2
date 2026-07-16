export function presetsForOption(presets, optionId) {
  return presets.filter((preset) => preset.optionId === optionId);
}

export function filterPresets(presets, filters = {}) {
  return presets.filter((preset) => ['difficulty', 'objective', 'storyline'].every(
    (key) => !filters[key] || preset.tags?.[key] === filters[key],
  ));
}

export function searchPresets(presets, query = '') {
  const term = query.trim().toLowerCase();
  if (!term) return presets;
  return presets.filter((preset) => [preset.label, preset.description, preset.prompt, ...Object.values(preset.tags ?? {})]
    .some((value) => String(value).toLowerCase().includes(term)));
}

export function filterOptionsForPresets(presets) {
  return {
    difficulty: [...new Set(presets.map((preset) => preset.tags.difficulty))],
    objective: [...new Set(presets.map((preset) => preset.tags.objective))].sort(),
    storyline: [...new Set(presets.map((preset) => preset.tags.storyline))].sort(),
  };
}

export function applyPuzzlePreset(blankDraft, preset) {
  if (!preset) return { ...blankDraft, _presetId: '' };
  return {
    ...blankDraft,
    prompt: preset.prompt,
    answer: preset.optionId.startsWith('hash_') ? '' : preset.expectedAnswer,
    config: structuredClone(preset.config),
    _presetId: preset.id,
  };
}
