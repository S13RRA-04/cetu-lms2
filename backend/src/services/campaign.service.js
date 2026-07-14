'use strict';
const { CampaignDrop, CampaignDropUnlock, Assignment, AssignmentUnlock,
        CourseContentItem, CourseContentUnlock, ScenarioPackage, ScenarioPackageUnlock,
        Squad, Course, Cohort } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { codeToName } = require('../constants/victims');

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

  const squads = await Squad.findAll({ where: { cohort_id: cohortId } });
  const assignedSquads = squads.filter((s) => s.victim_code);
  const skippedSquads  = squads.filter((s) => !s.victim_code).map((s) => s.number);

  const assignments = await Assignment.findAll({
    where: { course_id: drop.course_id, drop_number: drop.number },
  });
  const contentItems = await CourseContentItem.findAll({
    where: { course_id: drop.course_id, drop_number: drop.number },
  });
  const scenarioPackages = await ScenarioPackage.findAll({
    where: { course_id: drop.course_id, drop_number: drop.number, is_published: true },
  });

  let releasedAssignments = 0;
  let releasedContent     = 0;
  let releasedPackages    = 0;

  for (const squad of assignedSquads) {
    const victimName = codeToName(squad.victim_code);

    for (const a of assignments) {
      if (a.victim_name && a.victim_name !== victimName) continue;
      const squad_id = a.victim_name ? squad.id : null;
      const [, created] = await AssignmentUnlock.findOrCreate({
        where:    { assignment_id: a.id, cohort_id: cohortId, squad_id },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) releasedAssignments++;
    }

    for (const ci of contentItems) {
      if (ci.victim_code && ci.victim_code !== squad.victim_code) continue;
      const squad_id = ci.victim_code ? squad.id : null;
      const [, created] = await CourseContentUnlock.findOrCreate({
        where:    { content_id: ci.id, cohort_id: cohortId, squad_id },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      });
      if (created) releasedContent++;
    }

    for (const p of scenarioPackages) {
      if (p.victim_code && p.victim_code !== squad.victim_code) continue;
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

async function lockDrop(dropId, cohortId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  await CampaignDropUnlock.destroy({ where: { drop_id: dropId, cohort_id: cohortId } });
}

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, releaseDrop, lockDrop, verifyVaultPin };
