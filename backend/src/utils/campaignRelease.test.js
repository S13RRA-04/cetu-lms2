'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { partitionDropMaterials } = require('./campaignRelease');

test('squad-agnostic drop material does not require victim-scoped release', () => {
  const result = partitionDropMaterials(
    [{ id: 'a1', victim_name: null }],
    [{ id: 'c1', victim_code: null }],
    [{ id: 'p1', victim_code: null }],
  );

  assert.equal(result.hasVictimScopedMaterial, false);
  assert.equal(result.sharedAssignments.length, 1);
  assert.equal(result.sharedContent.length, 1);
  assert.equal(result.sharedPackages.length, 1);
});

test('victim-tagged material retains squad-specific release requirement', () => {
  const result = partitionDropMaterials(
    [{ id: 'a1', victim_name: 'Dogwood Hotel & Resort' }],
    [{ id: 'c1', victim_code: 'DOGWOOD' }],
    [],
  );

  assert.equal(result.hasVictimScopedMaterial, true);
  assert.equal(result.victimAssignments.length, 1);
  assert.equal(result.victimContent.length, 1);
});
