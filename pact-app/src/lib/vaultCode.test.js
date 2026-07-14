import test from 'node:test';
import assert from 'node:assert/strict';
import { insertVaultCode, MAX_VAULT_CODE_LENGTH } from './vaultCode.js';

test('pastes a complete cipher answer at the cursor', () => {
  assert.deepEqual(insertVaultCode('KEY-', 'ALPHA 42!', 4, 4), {
    value: 'KEY-ALPHA 42!',
    caret: 13,
  });
});

test('paste replaces the selected portion of an answer', () => {
  assert.deepEqual(insertVaultCode('ALPHA-WRONG-END', 'BRAVO', 6, 11), {
    value: 'ALPHA-BRAVO-END',
    caret: 11,
  });
});

test('paste enforces the vault answer length limit', () => {
  const result = insertVaultCode('', 'X'.repeat(MAX_VAULT_CODE_LENGTH + 20), 0, 0);
  assert.equal(result.value.length, MAX_VAULT_CODE_LENGTH);
  assert.equal(result.caret, MAX_VAULT_CODE_LENGTH);
});
