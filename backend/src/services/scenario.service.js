'use strict';
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET, R2_DECKS_PREFIX } = require('../config/r2');
const { ScenarioPackage, ScenarioPackageUnlock, Course, Cohort, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

function keyToTitle(key) {
  const fileName = key.split('/').pop() ?? key;
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function syncFromR2(courseId) {
  try {
    const cmd      = new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: R2_DECKS_PREFIX });
    const response = await r2Client.send(cmd);
    const objects  = (response.Contents ?? []).filter(
      (obj) => !obj.Key.endsWith('/') && obj.Key !== R2_DECKS_PREFIX
    );

    if (!objects.length) return;

    const existing    = await ScenarioPackage.findAll({ where: { course_id: courseId } });
    const existingKeys = new Set(existing.map((p) => p.r2_key));
    const maxRelease   = existing.reduce((m, p) => Math.max(m, p.release_number), 0);

    let nextRelease = maxRelease + 1;
    for (const obj of objects) {
      if (existingKeys.has(obj.Key)) continue;
      const fileName = obj.Key.split('/').pop();
      await ScenarioPackage.create({
        course_id:      courseId,
        title:          keyToTitle(obj.Key),
        file_name:      fileName,
        r2_key:         obj.Key,
        release_number: nextRelease++,
        is_published:   false,
      });
    }
  } catch (err) {
    console.error('[scenario] R2 sync error:', err.message);
  }
}

async function listForStudent(courseId, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (!enrollment) throw new ForbiddenError('Not enrolled in this course');

  const unlockedSet = new Set();
  if (enrollment.cohort_id) {
    const unlocks = await ScenarioPackageUnlock.findAll({ where: { cohort_id: enrollment.cohort_id } });
    unlocks.forEach((u) => unlockedSet.add(u.package_id));
  }

  const packages = await ScenarioPackage.findAll({
    where: { course_id: courseId, is_published: true },
    order: [['release_number', 'ASC']],
  });

  return packages.map((p) => ({
    ...p.toJSON(),
    is_unlocked:   unlockedSet.has(p.id),
    download_url:  unlockedSet.has(p.id) ? `${R2_PUBLIC_BASE_URL}/${p.r2_key}` : null,
  }));
}

async function listForAdmin(courseId) {
  await syncFromR2(courseId);
  return ScenarioPackage.findAll({
    where:   { course_id: courseId },
    include: [{
      model: ScenarioPackageUnlock,
      as:    'unlocks',
      include: [{ model: Cohort, attributes: ['id', 'name'] }],
    }],
    order: [['release_number', 'ASC']],
  });
}

async function getDownloadUrl(packageId, userId) {
  const pkg = await ScenarioPackage.findByPk(packageId);
  if (!pkg) throw new NotFoundError('ScenarioPackage');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: pkg.course_id } });
  if (!enrollment?.cohort_id) throw new ForbiddenError('No cohort enrollment');

  const unlock = await ScenarioPackageUnlock.findOne({
    where: { package_id: packageId, cohort_id: enrollment.cohort_id },
  });
  if (!unlock) throw new ForbiddenError('This package has not been released for your cohort');

  return `${R2_PUBLIC_BASE_URL}/${pkg.r2_key}`;
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return ScenarioPackage.create({ ...data, course_id: courseId });
}

async function update(id, data) {
  const pkg = await ScenarioPackage.findByPk(id);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  return pkg.update(data);
}

async function remove(id) {
  const pkg = await ScenarioPackage.findByPk(id);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  await pkg.destroy();
}

async function unlockForCohort(packageId, cohortId, unlockerId) {
  const pkg = await ScenarioPackage.findByPk(packageId);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const [unlock] = await ScenarioPackageUnlock.findOrCreate({
    where:    { package_id: packageId, cohort_id: cohortId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });
  return unlock;
}

async function lockForCohort(packageId, cohortId) {
  await ScenarioPackageUnlock.destroy({ where: { package_id: packageId, cohort_id: cohortId } });
}

module.exports = {
  listForStudent, listForAdmin, getDownloadUrl,
  create, update, remove, unlockForCohort, lockForCohort,
};
