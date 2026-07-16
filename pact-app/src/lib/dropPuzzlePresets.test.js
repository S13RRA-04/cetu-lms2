import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPuzzlePreset, filterOptionsForPresets, filterPresets, presetsForOption, searchPresets } from './dropPuzzlePresets.js';

const presets = [
  { id: 'one', optionId: 'cipher_caesar', label: 'Alpha', description: 'Decode', prompt: 'Prompt', expectedAnswer: 'SECRET', tags: { difficulty: 'beginner', objective: 'cryptography', storyline: 'Story A' }, config: { method: 'caesar', shift: 3, cipherText: 'VHFUHW' } },
  { id: 'two', optionId: 'log_auth', label: 'Bravo', description: 'Inspect', prompt: 'Find user', expectedAnswer: 'alex', tags: { difficulty: 'advanced', objective: 'log analysis', storyline: 'Story B' }, config: { lineFormat: 'auth', logLines: ['x'] } },
];

test('frontend helpers search and filter API-provided presets', () => {
  assert.deepEqual(presetsForOption(presets, 'cipher_caesar').map(({ id }) => id), ['one']);
  assert.deepEqual(filterPresets(presets, { difficulty: 'advanced' }).map(({ id }) => id), ['two']);
  assert.deepEqual(searchPresets(presets, 'story a').map(({ id }) => id), ['one']);
  assert.deepEqual(filterOptionsForPresets(presets).difficulty, ['beginner', 'advanced']);
});

test('frontend applies only a selected API DTO and independently clones config', () => {
  const blank = { puzzle_type: 'cipher_wheel', prompt: '', answer: '', config: {} };
  const first = applyPuzzlePreset(blank, presets[0]);
  const second = applyPuzzlePreset(blank, presets[0]);
  assert.equal(first.answer, 'SECRET');
  first.config.shift = 7;
  assert.equal(second.config.shift, 3);
});
