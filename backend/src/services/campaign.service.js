'use strict';
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { CampaignDrop, CampaignDropUnlock, Assignment, AssignmentUnlock,
        CourseContentItem, CourseContentUnlock, ScenarioPackage, ScenarioPackageUnlock,
        Squad, Course, Cohort, Enrollment, DropLocationSelection } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const { codeToName } = require('../constants/victims');
const { partitionDropMaterials, unpublishedIds, buildReleasePreview } = require('../utils/campaignRelease');
const { invalidateCourseContentLists } = require('./courseContent.service');
const { invalidateAssignmentLists, invalidateStudentCache } = require('./assignment.service');
const { invalidatePackageLists } = require('./scenario.service');
const { listPuzzlesForDrops } = require('./campaignPuzzle.service');
const { scenarioSlugFromName } = require('../utils/r2CaseFile');

async function listDrops(courseId, cohortId, includePin = false, userId = null) {
  const drops = await CampaignDrop.findAll({
    where: { course_id: courseId },
    include: cohortId
      ? [{
          model:    CampaignDropUnlock,
          as:       'unlocks',
          required: false,
          where:    { cohort_id: cohortId },
        }]
      : [],
    order: [['number', 'ASC']],
  });

  // Same staff/non-staff visibility flag vault_pin already uses — puzzle
  // answers must never reach a student client either.
  const [puzzlesByDrop, selections] = await Promise.all([
    listPuzzlesForDrops(drops.map((d) => d.id), { includeAnswers: includePin }),
    // Only students need their own location choice surfaced — staff never
    // self-report, they configure location_options instead.
    !includePin && userId
      ? DropLocationSelection.findAll({ where: { user_id: userId, drop_id: drops.map((d) => d.id) } })
      : Promise.resolve([]),
  ]);
  const selectionByDrop = new Map(selections.map((s) => [s.drop_id, s.location_code]));

  return drops.map((d) => {
    const json = d.toJSON();
    const pin  = json.vault_pin;
    if (!includePin) delete json.vault_pin;
    return {
      ...json,
      vault_pin_length: pin ? pin.length : null,
      is_unlocked: cohortId ? (d.unlocks?.length > 0) : null,
      unlocked_at: cohortId ? (d.unlocks?.[0]?.unlocked_at ?? null) : null,
      puzzles: puzzlesByDrop.get(d.id) ?? [],
      location_selection: selectionByDrop.get(d.id) ?? null,
    };
  });
}

/* Student self-reports which physical location (of drop.location_options)
   they searched — gates location-tagged assignments/content/packages for
   this drop to just that location. See utils/dropLocation.js. */
async function setLocationSelection(dropId, userId, locationCode) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: drop.course_id } });
  if (!enrollment) throw new ForbiddenError('Not enrolled in this course');

  const validCodes = (drop.location_options ?? []).map((o) => o.code);
  if (!validCodes.includes(locationCode)) {
    throw new AppError(`location_code must be one of: ${validCodes.join(', ') || '(none configured for this drop)'}`, 400, 'INVALID_LOCATION_CODE');
  }

  const [selection] = await DropLocationSelection.findOrCreate({
    where:    { drop_id: dropId, user_id: userId },
    defaults: { location_code: locationCode },
  });
  // findOrCreate won't update an existing row — a student can change their
  // mind before finishing the drop, so upsert explicitly.
  if (selection.location_code !== locationCode) {
    selection.location_code = locationCode;
    await selection.save();
  }
  invalidateStudentCache(drop.course_id, userId);
  return { location_code: selection.location_code };
}

async function verifyVaultPin(dropId, pin) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  if (!drop.vault_enabled || !drop.vault_pin) return { valid: false };
  return { valid: drop.vault_pin.toLowerCase().trim() === String(pin).toLowerCase().trim() };
}

// scenario_name must match the slug form used by assignments/course-content
// (e.g. "packet-heist") — release matching in campaignRelease.js and the
// admin wizard both do strict equality against that slug, so anything else
// silently breaks pairing.
function normalizeDropData(data) {
  if (!Object.hasOwn(data, 'scenario_name') || data.scenario_name == null) return data;
  return { ...data, scenario_name: scenarioSlugFromName(data.scenario_name) || null };
}

// Drop numbers repeat across scenarios. Always include the drop's scenario
// when resolving paired material so releasing Packet Heist Drop 4 cannot also
// publish or unlock Brokered Exit Drop 4 content in the same course.
function pairedMaterialWhere(drop) {
  return {
    course_id: drop.course_id,
    drop_number: drop.number,
    ...(drop.scenario_name ? { scenario_name: drop.scenario_name } : {}),
  };
}

function enabledPuzzlePreview(puzzles) {
  return puzzles
    .filter((puzzle) => puzzle.enabled)
    .map(({ id, puzzle_type, order_index, prompt }) => ({ id, puzzle_type, order_index, prompt }));
}

function hasEnabledTransmissionGate(drop, puzzles) {
  return drop.signal_enabled === true
    || drop.vault_enabled === true
    || puzzles.some((puzzle) => puzzle.enabled === true);
}

function assertCohortHasActiveLearners(cohort, activeLearnerCount) {
  if (activeLearnerCount === 0) {
    throw new AppError(
      `Cannot release to ${cohort.name}: this cohort has no active learners`,
      409,
      'EMPTY_COHORT',
    );
  }
}

async function createDrop(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const existing = await CampaignDrop.findOne({ where: { course_id: courseId, number: data.number } });
  if (existing) throw new AppError(`Drop ${data.number} already exists for this course`, 409, 'CONFLICT');

  return CampaignDrop.create({ course_id: courseId, ...normalizeDropData(data) });
}

function assertCompleteVaultConfig(vaultHint, vaultPin) {
  const hasInstructions = typeof vaultHint === 'string' && vaultHint.trim().length > 0;
  const hasAnswer = typeof vaultPin === 'string' && vaultPin.trim().length > 0;
  if (hasInstructions !== hasAnswer) {
    throw new AppError('Vault Lock requires both instructions and an expected answer', 400, 'VALIDATION_ERROR');
  }
}

async function updateDrop(dropId, data) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  assertCompleteVaultConfig(
    Object.hasOwn(data, 'vault_hint') ? data.vault_hint : drop.vault_hint,
    Object.hasOwn(data, 'vault_pin') ? data.vault_pin : drop.vault_pin,
  );
  return drop.update(normalizeDropData(data));
}

async function deleteDrop(dropId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  await drop.destroy();
}

async function previewRelease(dropId, cohortId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const materialWhere = pairedMaterialWhere(drop);
  const [squads, assignments, contentItems, scenarioPackages, puzzlesByDrop, activeLearnerCount] = await Promise.all([
    Squad.findAll({
      where: { cohort_id: cohortId },
      attributes: ['id', 'number', 'victim_code'],
      include: [{ association: 'students', attributes: ['professional_role', 'certifications'] }],
    }),
    Assignment.findAll({ where: materialWhere }),
    CourseContentItem.findAll({ where: materialWhere }),
    // Not is_published-filtered: release publishes any draft still paired to
    // this drop, so the preview should reflect what will actually go out.
    ScenarioPackage.findAll({ where: materialWhere }),
    // Answers are deliberately excluded from release-preview responses.
    listPuzzlesForDrops([drop.id], { includeAnswers: false }),
    Enrollment.count({ where: { cohort_id: cohortId, course_id: drop.course_id, status: 'active', role: 'student' } }),
  ]);

  const enabledPuzzles = enabledPuzzlePreview(puzzlesByDrop.get(drop.id) ?? []);

  return {
    drop: {
      id: drop.id,
      number: drop.number,
      title: drop.title,
      signal_enabled: drop.signal_enabled,
      vault_enabled: drop.vault_enabled,
      enabled_puzzles: enabledPuzzles,
    },
    cohort: { id: cohort.id, name: cohort.name, active_learner_count: activeLearnerCount },
    ...buildReleasePreview(squads, { assignments, contentItems, scenarioPackages, codeToName }),
  };
}

/* Fan out a drop release per squad, using each squad's manually-assigned
   victim to decide which victim-tagged assignments/content/R2 packages it
   gets. Untagged (victim-less) items stay cohort-wide, matching the old
   broadcast behavior. Squads with no victim assigned yet are skipped and
   reported back so staff know to visit the victim-assignment panel first. */
async function releaseDrop(dropId, cohortId, unlockerId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const activeLearnerCount = await Enrollment.count({
    where: { cohort_id: cohortId, course_id: drop.course_id, status: 'active', role: 'student' },
  });
  assertCohortHasActiveLearners(cohort, activeLearnerCount);

  const puzzlesByDrop = await listPuzzlesForDrops([drop.id], { includeAnswers: false });
  if (!hasEnabledTransmissionGate(drop, puzzlesByDrop.get(drop.id) ?? [])) {
    throw new AppError(
      'Enable Signal Hunt, Vault Lock, or at least one puzzle before releasing this drop',
      409,
      'TRANSMISSION_GATE_REQUIRED',
    );
  }

  // Upsert the drop unlock record
  const [unlock] = await CampaignDropUnlock.findOrCreate({
    where:    { drop_id: dropId, cohort_id: cohortId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });

  const materialWhere = pairedMaterialWhere(drop);
  const [squads, assignments, contentItems, scenarioPackages] = await Promise.all([
    Squad.findAll({ where: { cohort_id: cohortId } }),
    Assignment.findAll({ where: materialWhere }),
    CourseContentItem.findAll({ where: materialWhere }),
    // Not is_published-filtered: a draft package tied to this drop must still
    // be fetched here so the publish step below can pick it up — filtering
    // it out up front (as before) meant it was never published or unlocked
    // at all, silently skipping it until someone flipped it by hand.
    ScenarioPackage.findAll({ where: materialWhere }),
  ]);

  const {
    sharedAssignments, victimAssignments,
    sharedContent, victimContent,
    sharedPackages, victimPackages,
    hasVictimScopedMaterial,
  } = partitionDropMaterials(assignments, contentItems, scenarioPackages);

  // Releasing explicitly paired Case Files, challenges, and encryption-game
  // packages also publishes them. Unlock rows alone are insufficient because
  // the learner query intentionally excludes drafts. This also repairs
  // legacy R2 items/seeded challenges created unpublished before this drop
  // was released.
  const contentIdsToPublish = unpublishedIds(contentItems);
  if (contentIdsToPublish.length > 0) {
    await CourseContentItem.update(
      { is_published: true },
      { where: { id: { [Op.in]: contentIdsToPublish } } },
    );
    invalidateCourseContentLists(drop.course_id);
  }

  const assignmentIdsToPublish = unpublishedIds(assignments);
  if (assignmentIdsToPublish.length > 0) {
    await Assignment.update(
      { is_published: true },
      { where: { id: { [Op.in]: assignmentIdsToPublish } } },
    );
    invalidateAssignmentLists();
  }

  const packageIdsToPublish = unpublishedIds(scenarioPackages);
  if (packageIdsToPublish.length > 0) {
    await ScenarioPackage.update(
      { is_published: true },
      { where: { id: { [Op.in]: packageIdsToPublish } } },
    );
    invalidatePackageLists(drop.course_id, cohortId);
  }

  // A squad's victim can change after an earlier release. Remove old
  // squad-scoped unlocks for this drop before rebuilding access from the
  // current victim assignments. Cohort-wide unlocks remain untouched.
  const assignmentIds = assignments.map((item) => item.id);
  const contentIds = contentItems.map((item) => item.id);
  const [reconciledAssignmentUnlocks, reconciledContentUnlocks] = await Promise.all([
    assignmentIds.length > 0
      ? AssignmentUnlock.destroy({
          where: { cohort_id: cohortId, assignment_id: { [Op.in]: assignmentIds }, squad_id: { [Op.ne]: null } },
        })
      : 0,
    contentIds.length > 0
      ? CourseContentUnlock.destroy({
          where: { cohort_id: cohortId, content_id: { [Op.in]: contentIds }, squad_id: { [Op.ne]: null } },
        })
      : 0,
  ]);

  const assignedSquads = hasVictimScopedMaterial ? squads.filter((squad) => squad.victim_code) : [];
  const skippedSquads = hasVictimScopedMaterial
    ? squads.filter((squad) => !squad.victim_code).map((squad) => squad.number)
    : [];

  let releasedAssignments = 0;
  let releasedContent     = 0;
  let releasedPackages    = 0;

  // Squad-agnostic material is released once at cohort scope. It must not
  // depend on squads existing or having victim assignments.
  for (const assignment of sharedAssignments) {
    const [, created] = await AssignmentUnlock.findOrCreate({
      where: { assignment_id: assignment.id, cohort_id: cohortId, squad_id: null },
      defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
    });
    if (created) releasedAssignments++;
  }

  for (const item of sharedContent) {
    const [, created] = await CourseContentUnlock.findOrCreate({
      where: { content_id: item.id, cohort_id: cohortId, squad_id: null },
      defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
    });
    if (created) releasedContent++;
  }

  for (const pkg of sharedPackages) {
    const [, created] = await ScenarioPackageUnlock.findOrCreate({
      where: { package_id: pkg.id, cohort_id: cohortId },
      defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
    });
    if (created) releasedPackages++;
  }

  for (const squad of assignedSquads) {
    const victimName = codeToName(squad.victim_code);

    for (const a of victimAssignments) {
      if (a.victim_name !== victimName) continue;
      const [, created] = await AssignmentUnlock.findOrCreate({
        where:    { assignment_id: a.id, cohort_id: cohortId, squad_id: squad.id },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) releasedAssignments++;
    }

    for (const ci of victimContent) {
      if (ci.victim_code !== squad.victim_code) continue;
      const [, created] = await CourseContentUnlock.findOrCreate({
        where:    { content_id: ci.id, cohort_id: cohortId, squad_id: squad.id },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) releasedContent++;
    }

    for (const p of victimPackages) {
      if (p.victim_code !== squad.victim_code) continue;
      const [, created] = await ScenarioPackageUnlock.findOrCreate({
        where:    { package_id: p.id, cohort_id: cohortId },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) releasedPackages++;
    }
  }

  return {
    drop, unlock,
    released_assignments: releasedAssignments,
    released_content:     releasedContent,
    released_packages:    releasedPackages,
    reconciled_assignment_unlocks: reconciledAssignmentUnlocks,
    reconciled_content_unlocks: reconciledContentUnlocks,
    skipped_squads:       skippedSquads,
  };
}

async function lockDrop(dropId, cohortId, { revokeRelated = false } = {}) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  return sequelize.transaction(async (transaction) => {
    const revoked = { drop: 0, assignments: 0, content: 0, packages: 0 };
    revoked.drop = await CampaignDropUnlock.destroy({
      where: { drop_id: dropId, cohort_id: cohortId },
      transaction,
    });

    if (!revokeRelated) return { revoked };

    const materialWhere = pairedMaterialWhere(drop);
    const [assignments, contentItems, scenarioPackages] = await Promise.all([
      Assignment.findAll({
        where: materialWhere,
        attributes: ['id'], transaction,
      }),
      CourseContentItem.findAll({
        where: materialWhere,
        attributes: ['id'], transaction,
      }),
      ScenarioPackage.findAll({
        where: materialWhere,
        attributes: ['id'], transaction,
      }),
    ]);

    const assignmentIds = assignments.map((item) => item.id);
    const contentIds = contentItems.map((item) => item.id);
    const packageIds = scenarioPackages.map((item) => item.id);

    if (assignmentIds.length > 0) {
      revoked.assignments = await AssignmentUnlock.destroy({
        where: { cohort_id: cohortId, assignment_id: { [Op.in]: assignmentIds } },
        transaction,
      });
    }
    if (contentIds.length > 0) {
      revoked.content = await CourseContentUnlock.destroy({
        where: { cohort_id: cohortId, content_id: { [Op.in]: contentIds } },
        transaction,
      });
    }
    if (packageIds.length > 0) {
      revoked.packages = await ScenarioPackageUnlock.destroy({
        where: { cohort_id: cohortId, package_id: { [Op.in]: packageIds } },
        transaction,
      });
    }

    return { revoked };
  });
}

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, previewRelease, releaseDrop, lockDrop, verifyVaultPin, normalizeDropData, pairedMaterialWhere, enabledPuzzlePreview, hasEnabledTransmissionGate, assertCohortHasActiveLearners, setLocationSelection };
