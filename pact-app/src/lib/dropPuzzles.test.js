import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDropStages, getNextStage } from './dropPuzzles.js';

const NONE_COMPLETED = { signal: false, vault: false, puzzleIds: new Set() };

test('resolveDropStages walks Signal -> Vault -> puzzles (order_index asc) -> Transmission', () => {
  const drop = {
    signal_enabled: true, html_signal: 'alpha',
    vault_enabled: true, vault_hint: 'a riddle',
    puzzles: [
      { id: 'p2', order_index: 1, enabled: true },
      { id: 'p1', order_index: 0, enabled: true },
    ],
  };
  const stages = resolveDropStages(drop, NONE_COMPLETED);
  assert.deepEqual(stages.map((s) => s.kind), ['signal', 'vault', 'puzzle', 'puzzle', 'transmission']);
  assert.deepEqual(stages.slice(2, 4).map((s) => s.puzzle.id), ['p1', 'p2']);
});

test('resolveDropStages skips a stage whose enabled flag is false', () => {
  const drop = { signal_enabled: false, html_signal: 'alpha', vault_enabled: true, vault_hint: 'x', puzzles: [] };
  assert.deepEqual(resolveDropStages(drop, NONE_COMPLETED).map((s) => s.kind), ['vault', 'transmission']);
});

test('resolveDropStages skips a stage with no content even if enabled', () => {
  const drop = { signal_enabled: true, html_signal: null, vault_enabled: true, vault_hint: '', puzzles: [] };
  assert.deepEqual(resolveDropStages(drop, NONE_COMPLETED).map((s) => s.kind), ['transmission']);
});

test('resolveDropStages skips an individually disabled puzzle', () => {
  const drop = { puzzles: [{ id: 'p1', order_index: 0, enabled: false }, { id: 'p2', order_index: 1, enabled: true }] };
  const stages = resolveDropStages(drop, NONE_COMPLETED);
  assert.deepEqual(stages.map((s) => s.kind), ['puzzle', 'transmission']);
  assert.equal(stages[0].puzzle.id, 'p2');
});

test('resolveDropStages skips completed stages', () => {
  const drop = {
    signal_enabled: true, html_signal: 'x', vault_enabled: true, vault_hint: 'y',
    puzzles: [{ id: 'p1', order_index: 0, enabled: true }],
  };
  const completed = { signal: true, vault: true, puzzleIds: new Set(['p1']) };
  assert.deepEqual(resolveDropStages(drop, completed).map((s) => s.kind), ['transmission']);
});

test('getNextStage returns the first unresolved stage', () => {
  const drop = { signal_enabled: true, html_signal: 'x', puzzles: [] };
  assert.equal(getNextStage(drop, NONE_COMPLETED).kind, 'signal');
  assert.equal(getNextStage(drop, { signal: true, vault: false, puzzleIds: new Set() }).kind, 'transmission');
});

test('resolveDropStages always terminates with transmission even with nothing else enabled', () => {
  const drop = { puzzles: [] };
  assert.deepEqual(resolveDropStages(drop, NONE_COMPLETED).map((s) => s.kind), ['transmission']);
});
