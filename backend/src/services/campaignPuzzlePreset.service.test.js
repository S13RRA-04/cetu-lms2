'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { expectedAnswerForPreset, filterPresets, GAME_PRESETS, listPresets, PRESET_FILTER_OPTIONS, presetsForOption, searchPresets } = require('./campaignPuzzlePreset.service');

test('firewall games expose the PACKET HEIST through-Drop-4 preset', () => {
  const presets = presetsForOption('log_firewall');
  const packetHeist = presets.find(({ id }) => id === 'packet-heist-restonit-cross-service-denials');
  assert.ok(packetHeist);
  assert.match(packetHeist.label, /PACKET HEIST/);
  assert.match(packetHeist.label, /through Drop 4/);
});

test('VPN games expose a beginner RestonIT remote-access audit preset', () => {
  const matches = filterPresets(presetsForOption('log_vpn'), {
    difficulty: 'beginner',
    objective: 'remote access auditing',
    storyline: 'RestonIT Intrusion',
  });

  assert.deepEqual(matches.map(({ id }) => id), ['vpn-log-restonit-noncompliant-device']);
  assert.equal(matches[0].answer, 'j.holloway');
  assert.equal(matches[0].config.lineFormat, 'vpn');
});

test('every selectable game configuration exposes a ready-to-run preset', () => {
  const optionIds = [
    'signal_hunt', 'vault_lock',
    'cipher_caesar', 'cipher_rot13', 'cipher_atbash',
    'log_auth', 'log_firewall', 'log_vpn',
    'hash_md5', 'hash_sha1', 'hash_sha256',
  ];

  for (const optionId of optionIds) {
    const presets = presetsForOption(optionId);
    assert.ok(presets.length >= 3, `${optionId} should have at least three presets`);
    assert.ok(new Set(presets.map(({ tags }) => tags.difficulty)).size >= 2, `${optionId} should span difficulties`);
    assert.ok(new Set(presets.map(({ tags }) => tags.storyline)).size >= 2, `${optionId} should span storylines`);
    for (const preset of presets) {
      assert.ok(preset.prompt?.trim(), `${preset.id} should include learner tasking`);
      assert.ok(preset.config && typeof preset.config === 'object', `${preset.id} should include config`);
      if (!optionId.startsWith('hash_')) assert.ok(preset.answer?.trim(), `${preset.id} should include an answer`);
    }
  }
});

test('every preset has complete administrator filter tags', () => {
  for (const preset of GAME_PRESETS) {
    assert.ok(preset.tags?.difficulty, `${preset.id} should have difficulty`);
    assert.ok(preset.tags?.objective, `${preset.id} should have an objective`);
    assert.ok(preset.tags?.storyline, `${preset.id} should have a storyline`);
  }
  assert.deepEqual(PRESET_FILTER_OPTIONS.difficulty, ['beginner', 'intermediate', 'advanced']);
});

test('preset filters combine difficulty, learning objective, and storyline', () => {
  assert.deepEqual(
    filterPresets(GAME_PRESETS, { difficulty: 'intermediate', storyline: 'Digital Evidence Lab' }).map(({ id }) => id),
    ['hash-sha1-chain-record', 'hash-sha256-evidence-integrity', 'vault-lock-evidence-count'],
  );
  assert.deepEqual(
    filterPresets(GAME_PRESETS, { objective: 'file integrity verification' }).map(({ id }) => id),
    ['hash-md5-legacy-manifest', 'hash-sha256-evidence-integrity', 'hash-md5-export-check'],
  );
});

test('preset search covers titles, prompts, objectives, and storylines', () => {
  assert.ok(searchPresets(GAME_PRESETS, 'impossible travel').some(({ id }) => id === 'auth-log-impossible-travel'));
  assert.ok(searchPresets(GAME_PRESETS, 'privileged access').some(({ id }) => id === 'auth-log-dormant-admin'));
  assert.ok(searchPresets(GAME_PRESETS, 'ghost relay').length > 1);
  assert.equal(searchPresets(GAME_PRESETS, 'no-such-preset').length, 0);
});

test('every preset exposes an expected answer for administrator preview', () => {
  for (const preset of GAME_PRESETS) {
    const previewAnswer = expectedAnswerForPreset(preset);
    assert.ok(previewAnswer, `${preset.id} should have a preview answer`);
    if (preset.optionId.startsWith('hash_')) {
      assert.equal(previewAnswer, crypto.createHash(preset.config.algorithm).update(preset.config.inputText).digest('hex'));
    }
  }
  assert.equal(expectedAnswerForPreset(GAME_PRESETS.find(({ id }) => id === 'hash-md5-legacy-manifest')), '73751f0ca200e1e6360ee0c22e86f886');
});

test('protected API DTOs expose one explicit preview answer field without the storage field', () => {
  const dtos = listPresets();
  assert.equal(dtos.length, GAME_PRESETS.length);
  for (const dto of dtos) {
    assert.ok(dto.expectedAnswer);
    assert.equal(Object.hasOwn(dto, 'answer'), false);
  }
  dtos[0].config.signalCode = 'mutated';
  assert.notEqual(GAME_PRESETS[0].config.signalCode, 'mutated');
});
