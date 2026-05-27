'use strict';
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET, R2_DECKS_PREFIX } = require('../config/r2');
const { ScenarioPackage, ScenarioPackageUnlock, Course, Cohort, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

/* Convert a folder slug like "brokered-exit" → "Brokered Exit" */
function slugToTitle(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* List all non-folder objects under a given prefix */
async function listR2Files(prefix) {
  const files = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    });
    const resp = await r2Client.send(cmd);
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key.endsWith('/') && obj.Key !== prefix) files.push(obj);
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : null;
  } while (token);
  return files;
}

/*
  Sync: list the top-level sub-folders under R2_DECKS_PREFIX and create one
  ScenarioPackage row per folder (scenario slug). Idempotent — skips slugs
  that already have a row.
*/
async function syncFromR2(courseId) {
  try {
    /* Use delimiter to get top-level "folders" only */
    const cmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: R2_DECKS_PREFIX,
      Delimiter: '/',
    });
    const resp = await r2Client.send(cmd);

    /* CommonPrefixes are the immediate sub-folders */
    const scenarioPrefixes = (resp.CommonPrefixes ?? []).map((cp) => cp.Prefix);
    if (!scenarioPrefixes.length) return;

    const existing     = await ScenarioPackage.findAll({ where: { course_id: courseId } });
    const existingKeys = new Set(existing.map((p) => p.r2_key));
    const maxRelease   = existing.reduce((m, p) => Math.max(m, p.release_number), 0);

    let nextRelease = maxRelease + 1;
    for (const prefix of scenarioPrefixes) {
      if (existingKeys.has(prefix)) continue;
      /* derive a human title from the last path component */
      const slug  = prefix.replace(R2_DECKS_PREFIX, '').replace(/\/$/, '');
      const title = slugToTitle(slug);
      await ScenarioPackage.create({
        course_id:      courseId,
        title,
        file_name:      slug,   // slug used as identifier
        r2_key:         prefix, // full prefix, e.g. "scenarios/brokered-exit/"
        release_number: nextRelease++,
        is_published:   false,
      });
    }
  } catch (err) {
    console.error('[scenario] R2 sync error:', err.message);
  }
}

/* Build public URLs for every file inside a scenario's R2 prefix */
async function getFilesForPackage(pkg) {
  const objects = await listR2Files(pkg.r2_key);
  return objects.map((obj) => {
    /* Relative path inside the scenario folder for display */
    const relativePath = obj.Key.slice(pkg.r2_key.length);
    return {
      key:  obj.Key,
      name: relativePath,
      url:  `${R2_PUBLIC_BASE_URL}/${obj.Key}`,
      size: obj.Size,
    };
  });
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
    is_unlocked: unlockedSet.has(p.id),
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

/* Returns the file list for a package the student is unlocked for */
async function getDownloadUrl(packageId, userId) {
  const pkg = await ScenarioPackage.findByPk(packageId);
  if (!pkg) throw new NotFoundError('ScenarioPackage');

  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: pkg.course_id } });
  if (!enrollment?.cohort_id) throw new ForbiddenError('No cohort enrollment');

  const unlock = await ScenarioPackageUnlock.findOne({
    where: { package_id: packageId, cohort_id: enrollment.cohort_id },
  });
  if (!unlock) throw new ForbiddenError('This package has not been released for your cohort');

  const files = await getFilesForPackage(pkg);
  return { files };
}

/* Admin: list files for any package regardless of unlock status */
async function getFilesAdmin(packageId) {
  const pkg = await ScenarioPackage.findByPk(packageId);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  const files = await getFilesForPackage(pkg);
  return { files };
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
  listForStudent, listForAdmin, getDownloadUrl, getFilesAdmin,
  create, update, remove, unlockForCohort, lockForCohort,
};
