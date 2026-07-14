'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCampaignDropSchema,
  updateCampaignDropSchema,
  verifyVaultPinSchema,
  lockCampaignDropSchema,
  releasePreviewSchema,
} = require('./campaign.validator');

test('campaign drop creation requires complete vault configuration', () => {
  const { error } = createCampaignDropSchema.validate({
    number: 2,
    title: 'Drop 2',
    vault_hint: 'Decrypt the message.',
  });
  assert.ok(error);
});

test('campaign drop creation accepts manually configured instructions and answer', () => {
  const { error } = createCampaignDropSchema.validate({
    number: 2,
    title: 'Drop 2',
    vault_hint: 'Decrypt the message.',
    vault_pin: 'manual-answer',
  });
  assert.equal(error, undefined);
});

test('campaign drop patch permits one vault field for service-layer merge validation', () => {
  const { error } = updateCampaignDropSchema.validate({ vault_hint: 'Revised instructions.' });
  assert.equal(error, undefined);
});

test('vault verification rejects oversized answers', () => {
  const { error } = verifyVaultPinSchema.validate({ pin: 'x'.repeat(65) });
  assert.ok(error);
});

test('drop lock accepts explicit related-access revocation', () => {
  const { value, error } = lockCampaignDropSchema.validate({
    cohort_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    revoke_related: true,
  });
  assert.equal(error, undefined);
  assert.equal(value.revoke_related, true);
});

test('release preview requires a valid cohort id', () => {
  assert.ok(releasePreviewSchema.validate({ cohort_id: 'not-a-uuid' }).error);
  assert.equal(releasePreviewSchema.validate({ cohort_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' }).error, undefined);
});
