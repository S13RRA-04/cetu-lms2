import test from 'node:test';
import assert from 'node:assert/strict';
import { dropSeenId } from './dropSeen.js';

test('drop seen identity changes when the cohort release changes', () => {
  const drop = { id: 'drop-5', updatedAt: '2026-07-01T12:00:00.000Z' };

  assert.notEqual(
    dropSeenId({ ...drop, unlocked_at: '2026-07-15T16:00:00.000Z' }),
    dropSeenId({ ...drop, unlocked_at: '2026-07-15T17:00:00.000Z' }),
  );
});

test('drop seen identity still changes when released content is edited', () => {
  const drop = { id: 'drop-5', unlocked_at: '2026-07-15T16:00:00.000Z' };

  assert.notEqual(
    dropSeenId({ ...drop, updatedAt: '2026-07-15T16:05:00.000Z' }),
    dropSeenId({ ...drop, updatedAt: '2026-07-15T16:10:00.000Z' }),
  );
});

test('drop seen identity supports snake-case API timestamps', () => {
  assert.equal(
    dropSeenId({ id: 'drop-5', unlocked_at: 'release-1', updated_at: 'edit-1' }),
    'drop-5:release-1:edit-1',
  );
});
