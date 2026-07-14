'use strict';
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { CampaignDrop, CampaignDropUnlock, Assignment, AssignmentUnlock,
        CourseContentItem, CourseContentUnlock, ScenarioPackage, ScenarioPackageUnlock,
        Squad, Course, Cohort } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { codeToName } = require('../constants/victims');
const { partitionDropMaterials } = require('../utils/campaignRelease');

async function listDrops(courseId, cohortId, includePin = false) {
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

  return drops.map((d) => {
    const json = d.toJSON();
    const pin  = json.vault_pin;
    if (!includePin) delete json.vault_pin;
    return {
      ...json,
      vault_pin_length: pin ? pin.length : null,
      is_unlocked: cohortId ? (d.unlocks?.length > 0) : null,
      unlocked_at: cohortId ? (d.unlocks?.[0]?.unlocked_at ?? null) : null,
    };
  });
}

async function verifyVaultPin(dropId, pin) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  if (!drop.vault_enabled || !drop.vault_pin) return { valid: false };
  return { valid: drop.vault_pin.toLowerCase().trim() === String(pin).toLowerCase().trim() };
}

async function createDrop(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const existing = await CampaignDrop.findOne({ where: { course_id: courseId, number: data.number } });
  if (existing) throw new AppError(`Drop ${data.number} already exists for this course`, 409, 'CONFLICT');

  return CampaignDrop.create({ course_id: courseId, ...data });
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
  return drop.update(data);
}

async function deleteDrop(dropId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  await drop.destroy();
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

  // Upsert the drop unlock record
  const [unlock] = await CampaignDropUnlock.findOrCreate({
    where:    { drop_id: dropId, cohort_id: cohortId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });

  const [squads, assignments, contentItems, scenarioPackages] = await Promise.all([
    Squad.findAll({ where: { cohort_id: cohortId } }),
    Assignment.findAll({ where: { course_id: drop.course_id, drop_number: drop.number } }),
    CourseContentItem.findAll({ where: { course_id: drop.course_id, drop_number: drop.number } }),
    ScenarioPackage.findAll({
      where: { course_id: drop.course_id, drop_number: drop.number, is_published: true },
    }),
  ]);

  const {
    sharedAssignments, victimAssignments,
    sharedContent, victimContent,
    sharedPackages, victimPackages,
    hasVictimScopedMaterial,
  } = partitionDropMaterials(assignments, contentItems, scenarioPackages);

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

    const [assignments, contentItems, scenarioPackages] = await Promise.all([
      Assignment.findAll({
        where: { course_id: drop.course_id, drop_number: drop.number },
        attributes: ['id'], transaction,
      }),
      CourseContentItem.findAll({
        where: { course_id: drop.course_id, drop_number: drop.number },
        attributes: ['id'], transaction,
      }),
      ScenarioPackage.findAll({
        where: { course_id: drop.course_id, drop_number: drop.number },
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

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, releaseDrop, lockDrop, verifyVaultPin };
