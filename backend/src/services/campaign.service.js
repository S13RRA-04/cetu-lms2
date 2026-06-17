'use strict';
const { CampaignDrop, CampaignDropUnlock, Assignment, AssignmentUnlock,
        CourseContentItem, CourseContentUnlock, Course, Cohort } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');

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
  if (!drop.vault_pin) return { valid: false };
  return { valid: drop.vault_pin.toLowerCase().trim() === String(pin).toLowerCase().trim() };
}

async function createDrop(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const existing = await CampaignDrop.findOne({ where: { course_id: courseId, number: data.number } });
  if (existing) throw new AppError(`Drop ${data.number} already exists for this course`, 409, 'CONFLICT');

  return CampaignDrop.create({ course_id: courseId, ...data });
}

async function updateDrop(dropId, data) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  return drop.update(data);
}

async function deleteDrop(dropId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  await drop.destroy();
}

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

  // Bulk-unlock all assignments tagged to this drop number
  const assignments = await Assignment.findAll({
    where: { course_id: drop.course_id, drop_number: drop.number },
  });
  for (const a of assignments) {
    await AssignmentUnlock.findOrCreate({
      where:    { assignment_id: a.id, cohort_id: cohortId },
      defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
    });
  }

  // Bulk-unlock all course content items tagged to this drop number
  const contentItems = await CourseContentItem.findAll({
    where: { course_id: drop.course_id, drop_number: drop.number },
  });
  for (const ci of contentItems) {
    await CourseContentUnlock.findOrCreate({
      where:    { content_id: ci.id, cohort_id: cohortId },
      defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
    });
  }

  return { drop, unlock, released_assignments: assignments.length, released_content: contentItems.length };
}

async function lockDrop(dropId, cohortId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  await CampaignDropUnlock.destroy({ where: { drop_id: dropId, cohort_id: cohortId } });
}

module.exports = { listDrops, createDrop, updateDrop, deleteDrop, releaseDrop, lockDrop, verifyVaultPin };
