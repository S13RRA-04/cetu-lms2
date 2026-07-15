import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPuzzlePreset, presetsForOption } from './dropPuzzlePresets.js';

test('firewall games expose the PACKET HEIST through-Drop-4 preset', () => {
  const presets = presetsForOption('log_firewall');
  assert.equal(presets.length, 1);
  assert.match(presets[0].label, /PACKET HEIST/);
  assert.match(presets[0].label, /through Drop 4/);
});

test('preset application returns a complete independent firewall draft', () => {
  const [preset] = presetsForOption('log_firewall');
  const blank = { puzzle_type: 'log_grep', enabled: true, prompt: '', answer: '', config: { lineFormat: 'firewall', logLines: [] } };
  const first = applyPuzzlePreset(blank, preset.id);
  const second = applyPuzzlePreset(blank, preset.id);
  assert.equal(first.config.lineFormat, 'firewall');
  assert.equal(first.config.logLines.length, 15);
  assert.equal(first.answer, '192.0.2.201');
  first.config.logLines.pop();
  assert.equal(second.config.logLines.length, 15);
});
