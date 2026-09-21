'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { normalizePuzzleConfig, assertCompletePuzzleConfig, listPuzzlesForDrops, verifyPuzzleAnswer } = require('./campaignPuzzle.service');
const { CampaignDropPuzzle, CampaignDrop, Enrollment, Squad } = require('../models');

const PER_SQUAD_PUZZLE = {
  id: 'puzzle-1', drop_id: 'drop-1', puzzle_type: 'vault_lock', enabled: true, order_index: 0,
  prompt: 'Shared fallback prompt', answer: 'SHARED ANSWER',
  config: {
    perSquad: {
      REDSTONE: { prompt: 'Redstone prompt', answer: 'INC-9902' },
      CYBERDYNE: { prompt: 'CyberDyne prompt', answer: 'INC-2026-0620' },
    },
  },
};

function stubPuzzle(t, row) {
  const original = CampaignDropPuzzle.findAll;
  const originalOne = CampaignDropPuzzle.findOne;
  CampaignDropPuzzle.findAll = async () => [{ toJSON: () => structuredClone(row) }];
  CampaignDropPuzzle.findOne = async () => ({ ...structuredClone(row), toJSON: () => structuredClone(row) });
  t.after(() => { CampaignDropPuzzle.findAll = original; CampaignDropPuzzle.findOne = originalOne; });
}

function stubSquadOf(t, victimCode) {
  const originals = { drop: CampaignDrop.findByPk, enrollment: Enrollment.findOne, squad: Squad.findByPk };
  CampaignDrop.findByPk = async () => ({ course_id: 'course-1' });
  Enrollment.findOne = async () => (victimCode === undefined ? null : { squad_id: 'squad-1' });
  Squad.findByPk = async () => ({ victim_code: victimCode ?? null });
  t.after(() => { CampaignDrop.findByPk = originals.drop; Enrollment.findOne = originals.enrollment; Squad.findByPk = originals.squad; });
}

test('normalizePuzzleConfig keeps only known victim codes for vault_lock perSquad, trimming and dropping empties', () => {
  const config = normalizePuzzleConfig('vault_lock', {
    perSquad: {
      REDSTONE: { prompt: '  p  ', answer: ' a ' },
      NOTAVICTIM: { prompt: 'x', answer: 'y' },
      DOGWOOD: { prompt: '', answer: '' },
    },
  });
  assert.deepEqual(config, { perSquad: { REDSTONE: { prompt: 'p', answer: 'a' } } });
});

test('a student sees their own squad\'s prompt but never any perSquad answer map or the shared answer', async (t) => {
  stubPuzzle(t, PER_SQUAD_PUZZLE);
  const byDrop = await listPuzzlesForDrops(['drop-1'], { includeAnswers: false, victimCode: 'REDSTONE' });
  const [puzzle] = byDrop.get('drop-1');
  assert.equal(puzzle.prompt, 'Redstone prompt');
  assert.equal(puzzle.answer, undefined);
  assert.equal(puzzle.config.perSquad, undefined);
  assert.doesNotMatch(JSON.stringify(puzzle), /INC-9902|INC-2026-0620|SHARED ANSWER/);
});

test('a student with no victim (or one without an override) keeps the shared prompt and still gets no answers', async (t) => {
  stubPuzzle(t, PER_SQUAD_PUZZLE);
  for (const victimCode of [null, 'PIXELPLAY']) {
    const [puzzle] = (await listPuzzlesForDrops(['drop-1'], { includeAnswers: false, victimCode })).get('drop-1');
    assert.equal(puzzle.prompt, 'Shared fallback prompt');
    assert.doesNotMatch(JSON.stringify(puzzle), /INC-9902|INC-2026-0620|SHARED ANSWER/);
  }
});

test('the admin editor (includeAnswers) still receives the full perSquad config and shared answer', async (t) => {
  stubPuzzle(t, PER_SQUAD_PUZZLE);
  const [puzzle] = (await listPuzzlesForDrops(['drop-1'], { includeAnswers: true })).get('drop-1');
  assert.equal(puzzle.answer, 'SHARED ANSWER');
  assert.equal(puzzle.config.perSquad.REDSTONE.answer, 'INC-9902');
  assert.equal(puzzle.prompt, 'Shared fallback prompt');
});

test('verifyPuzzleAnswer checks a squad against its own perSquad answer, not another squad\'s or the shared one', async (t) => {
  stubPuzzle(t, PER_SQUAD_PUZZLE);
  stubSquadOf(t, 'REDSTONE');
  assert.equal((await verifyPuzzleAnswer('drop-1', 'puzzle-1', 'inc-9902', 'user-1')).valid, true);
  assert.equal((await verifyPuzzleAnswer('drop-1', 'puzzle-1', 'INC-2026-0620', 'user-1')).valid, false);
  assert.equal((await verifyPuzzleAnswer('drop-1', 'puzzle-1', 'SHARED ANSWER', 'user-1')).valid, false);
});

test('verifyPuzzleAnswer falls back to the shared answer when the squad has no victim/override or the caller is unknown', async (t) => {
  stubPuzzle(t, PER_SQUAD_PUZZLE);
  stubSquadOf(t, 'PIXELPLAY');
  assert.equal((await verifyPuzzleAnswer('drop-1', 'puzzle-1', 'shared answer', 'user-1')).valid, true);
  assert.equal((await verifyPuzzleAnswer('drop-1', 'puzzle-1', 'shared answer')).valid, true);
});

test('normalizePuzzleConfig defaults cipher_wheel to caesar shift 13 and strips unknown keys', () => {
  const config = normalizePuzzleConfig('cipher_wheel', { cipherText: 'uryyb', stray: 'nope' });
  assert.deepEqual(config, { cipherText: 'uryyb', method: 'caesar', shift: 13 });
});

test('normalizePuzzleConfig supports layered Signal Hunt and Vault Lock games', () => {
  assert.deepEqual(normalizePuzzleConfig('signal_hunt', { signalCode: 'BRAVO-7', stray: true }), { signalCode: 'BRAVO-7' });
  assert.deepEqual(normalizePuzzleConfig('vault_lock', { stray: true }), {});
});

test('assertCompletePuzzleConfig validates layered Signal Hunt and Vault Lock games', () => {
  assert.doesNotThrow(() => assertCompletePuzzleConfig('signal_hunt', {
    prompt: 'Inspect source', answer: 'BRAVO-7', config: { signalCode: 'BRAVO-7' },
  }));
  assert.doesNotThrow(() => assertCompletePuzzleConfig('vault_lock', {
    prompt: 'Decrypt evidence', answer: 'RESTON IT', config: {},
  }));
  assert.throws(() => assertCompletePuzzleConfig('signal_hunt', { prompt: 'Inspect', answer: '', config: {} }));
  assert.throws(() => assertCompletePuzzleConfig('vault_lock', { prompt: '', answer: 'x', config: {} }));
});

test('normalizePuzzleConfig coerces cipher_wheel shift into 1-25 and ignores shift for rot13', () => {
  assert.equal(normalizePuzzleConfig('cipher_wheel', { method: 'caesar', shift: 40 }).shift, 25);
  assert.equal(normalizePuzzleConfig('cipher_wheel', { method: 'caesar', shift: 0 }).shift, 1);
  assert.equal(normalizePuzzleConfig('cipher_wheel', { method: 'rot13', shift: 7 }).shift, undefined);
});

test('normalizePuzzleConfig defaults log_grep lineFormat to auth and coerces logLines to strings', () => {
  const config = normalizePuzzleConfig('log_grep', { logLines: ['a', 1, true] });
  assert.deepEqual(config, { logLines: ['a', '1', 'true'], lineFormat: 'auth' });
});

test('normalizePuzzleConfig passes through hash_match algorithm and defaults to sha256', () => {
  assert.equal(normalizePuzzleConfig('hash_match', { inputText: 'x', algorithm: 'md5' }).algorithm, 'md5');
  assert.equal(normalizePuzzleConfig('hash_match', { inputText: 'x' }).algorithm, 'sha256');
});

test('assertCompletePuzzleConfig accepts a complete cipher_wheel/log_grep record', () => {
  assert.doesNotThrow(() => assertCompletePuzzleConfig('cipher_wheel', {
    prompt: 'Decode it', answer: 'hello', config: { cipherText: 'uryyb' },
  }));
  assert.doesNotThrow(() => assertCompletePuzzleConfig('log_grep', {
    prompt: 'Find the IP', answer: '203.0.113.77', config: { logLines: ['line1'] },
  }));
});

test('assertCompletePuzzleConfig rejects cipher_wheel/log_grep missing an answer', () => {
  assert.throws(() => assertCompletePuzzleConfig('cipher_wheel', { prompt: 'x', config: { cipherText: 'a' } }));
  assert.throws(() => assertCompletePuzzleConfig('log_grep', { prompt: 'x', config: { logLines: ['a'] } }));
});

test('assertCompletePuzzleConfig rejects log_grep with an empty logLines array', () => {
  assert.throws(() => assertCompletePuzzleConfig('log_grep', { prompt: 'x', answer: 'y', config: { logLines: [] } }));
});

test('assertCompletePuzzleConfig accepts a complete hash_match record with no stored answer', () => {
  assert.doesNotThrow(() => assertCompletePuzzleConfig('hash_match', {
    config: { inputText: 'evidence string', algorithm: 'sha256' },
  }));
});

test('assertCompletePuzzleConfig rejects hash_match with a stray answer present', () => {
  assert.throws(() => assertCompletePuzzleConfig('hash_match', {
    answer: 'should not be here', config: { inputText: 'x', algorithm: 'sha256' },
  }));
});

test('assertCompletePuzzleConfig rejects hash_match missing/invalid algorithm', () => {
  assert.throws(() => assertCompletePuzzleConfig('hash_match', { config: { inputText: 'x' } }));
  assert.throws(() => assertCompletePuzzleConfig('hash_match', { config: { inputText: 'x', algorithm: 'crc32' } }));
});

// Locks in the exact hashing convention verifyPuzzleAnswer relies on: utf8
// input encoding, hex digest, compared lowercase/trimmed.
test('hash contract: sha256("hello") matches the known digest', () => {
  const digest = crypto.createHash('sha256').update('hello', 'utf8').digest('hex');
  assert.equal(digest, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
