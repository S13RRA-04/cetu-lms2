'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDropData, pairedMaterialWhere, enabledPuzzlePreview, hasEnabledTransmissionGate, assertCohortHasActiveLearners } = require('./campaign.service');

test('normalizeDropData slugifies a raw scenario title so it matches assignment/content records', () => {
  assert.equal(normalizeDropData({ scenario_name: 'PACKET HEIST' }).scenario_name, 'packet-heist');
});

test('normalizeDropData is a no-op on an already-slugified scenario_name', () => {
  assert.equal(normalizeDropData({ scenario_name: 'packet-heist' }).scenario_name, 'packet-heist');
});

test('normalizeDropData leaves other fields and missing/null scenario_name untouched', () => {
  assert.deepEqual(normalizeDropData({ title: 'Drop 2', number: 2 }), { title: 'Drop 2', number: 2 });
  assert.equal(normalizeDropData({ scenario_name: null }).scenario_name, null);
});

test('pairedMaterialWhere scopes repeated drop numbers to the selected scenario', () => {
  assert.deepEqual(
    pairedMaterialWhere({ course_id: 'course-1', number: 4, scenario_name: 'packet-heist' }),
    { course_id: 'course-1', drop_number: 4, scenario_name: 'packet-heist' },
  );
});

test('pairedMaterialWhere preserves legacy scenario-less drops', () => {
  assert.deepEqual(
    pairedMaterialWhere({ course_id: 'course-1', number: 4, scenario_name: null }),
    { course_id: 'course-1', drop_number: 4 },
  );
});

test('enabledPuzzlePreview returns ordered display metadata without answers or config', () => {
  assert.deepEqual(enabledPuzzlePreview([
    { id: 'disabled', puzzle_type: 'log_grep', enabled: false, order_index: 0, prompt: 'Hidden', answer: 'secret' },
    { id: 'cipher', puzzle_type: 'cipher_wheel', enabled: true, order_index: 1, prompt: 'Decrypt', answer: 'secret', config: { cipherText: 'x' } },
  ]), [
    { id: 'cipher', puzzle_type: 'cipher_wheel', order_index: 1, prompt: 'Decrypt' },
  ]);
});

test('hasEnabledTransmissionGate requires signal, vault, or an enabled puzzle', () => {
  assert.equal(hasEnabledTransmissionGate({ signal_enabled: false, vault_enabled: false }, []), false);
  assert.equal(hasEnabledTransmissionGate({ signal_enabled: true, vault_enabled: false }, []), true);
  assert.equal(hasEnabledTransmissionGate({ signal_enabled: false, vault_enabled: true }, []), true);
  assert.equal(hasEnabledTransmissionGate(
    { signal_enabled: false, vault_enabled: false },
    [{ enabled: false }, { enabled: true }],
  ), true);
});

test('drop release rejects a cohort with no active learners', () => {
  assert.throws(
    () => assertCohortHasActiveLearners({ name: 'TEST' }, 0),
    (error) => error.statusCode === 409 && error.code === 'EMPTY_COHORT' && /no active learners/.test(error.message),
  );
  assert.doesNotThrow(() => assertCohortHasActiveLearners({ name: 'PACT July' }, 37));
});
