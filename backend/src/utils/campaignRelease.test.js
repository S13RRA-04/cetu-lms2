'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { partitionDropMaterials, unpublishedIds, contentMatchesSquadVictim, buildReleasePreview } = require('./campaignRelease');

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

test('drop release identifies every paired Case File or challenge that still needs publishing', () => {
  assert.deepEqual(unpublishedIds([
    { id: 'published', is_published: true },
    { id: 'legacy-draft', is_published: false },
    { id: 'unset-publication-state', is_published: null },
  ]), ['legacy-draft', 'unset-publication-state']);
});

test('victim-scoped Case Files only match the squad current victim assignment', () => {
  assert.equal(contentMatchesSquadVictim(null, 'REDSTONE'), true);
  assert.equal(contentMatchesSquadVictim('REDSTONE', 'REDSTONE'), true);
  assert.equal(contentMatchesSquadVictim('PIXELPLAY', 'REDSTONE'), false);
});

test('release preview reports shared and victim-specific files per squad', () => {
  const preview = buildReleasePreview(
    [{ id: 's4', number: 4, victim_code: 'REDSTONE' }],
    {
      assignments: [],
      contentItems: [
        { id: 'shared', victim_code: null },
        { id: 'r1', victim_code: 'REDSTONE' },
        { id: 'r2', victim_code: 'REDSTONE' },
        { id: 'p1', victim_code: 'PIXELPLAY' },
      ],
      scenarioPackages: [{ id: 'rp', victim_code: 'REDSTONE' }],
      codeToName: (code) => code,
    },
  );
  assert.equal(preview.squads[0].victim_code, 'REDSTONE');
  assert.equal(preview.squads[0].total_files, 4);
  assert.equal(preview.squads[0].case_files, 3);
  assert.deepEqual(preview.squads[0].details.case_files.map((item) => item.id), ['shared', 'r1', 'r2']);
  assert.deepEqual(preview.squads[0].details.packages.map((item) => item.id), ['rp']);
});

test('release preview preserves role routing metadata for persona simulation', () => {
  const preview = buildReleasePreview(
    [{ id: 's1', number: 1, victim_code: null }],
    {
      assignments: [{ id: 'a1', title: 'Analyst tasking', role_filters: ['intelligence_analyst'], victim_name: null }],
      contentItems: [],
      scenarioPackages: [],
      codeToName: (code) => code,
    },
  );

  assert.deepEqual(preview.squads[0].details.challenges, [{
    id: 'a1',
    title: 'Analyst tasking',
    role_filters: ['intelligence_analyst'],
    victim_name: null,
  }]);
});
