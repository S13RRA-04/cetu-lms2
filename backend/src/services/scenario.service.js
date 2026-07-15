'use strict';
const { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { r2Client, R2_BUCKET, R2_DECKS_PREFIX } = require('../config/r2');
const { ScenarioPackage, ScenarioPackageUnlock, Course, Cohort, Enrollment, Squad } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const TtlCache = require('../utils/ttlCache');
const { scenarioSlugFromName } = require('../utils/r2CaseFile');

// scenario_name must be the same slug form assignments/course-content/campaign
// drops use (e.g. "packet-heist") — the student Evidence Repository groups
// packages and drop files by strict equality on this field, so anything else
// silently splits one case file into two.
function normalizeScenarioName(name) {
  return name ? (scenarioSlugFromName(name) || null) : null;
}

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

// Package list per course, and unlock list per cohort — shared across every
// student in the course/cohort, so a short TTL absorbs the 45s AppShell poll
// from every logged-in student without hiding a new release for long.
const packageListCache = new TtlCache(20_000);
const unlockListCache  = new TtlCache(20_000);

// R2 sync is a full bucket walk — throttle it instead of running it on every
// single admin page load.
const r2SyncCache = new TtlCache(30_000);

// Both caches are keyed by a single id (courseId / cohortId), so a targeted
// invalidation is cheap — used by a drop release publishing/unlocking
// packages outside this module's own create/unlockForCohort paths.
function invalidatePackageLists(courseId, cohortId) {
  if (courseId) packageListCache.invalidate(`packages:${courseId}`);
  if (cohortId) unlockListCache.invalidate(`unlocks:${cohortId}`);
}

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
        scenario_name:  normalizeScenarioName(slug),
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

/* Presigned GET URL for a single R2 object — valid for 1 hour */
async function presignDownload(key) {
  return getSignedUrl(r2Client, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 3600 });
}

/* Build file list for a package.
   presigned=true (student downloads) → generate short-lived signed GET URLs.
   presigned=false (admin browse)     → use public base URL. */
async function getFilesForPackage(pkg, presigned = false) {
  if (!pkg.r2_key.endsWith('/')) {
    const url = presigned
      ? await presignDownload(pkg.r2_key)
      : `${R2_PUBLIC_BASE_URL}/${pkg.r2_key}`;
    return [{ key: pkg.r2_key, name: pkg.r2_key.split('/').pop(), url, size: null }];
  }
  const objects = await listR2Files(pkg.r2_key);
  return Promise.all(objects.map(async (obj) => ({
    key:  obj.Key,
    name: obj.Key.slice(pkg.r2_key.length),
    url:  presigned ? await presignDownload(obj.Key) : `${R2_PUBLIC_BASE_URL}/${obj.Key}`,
    size: obj.Size,
  })));
}

async function listForStudent(courseId, userId) {
  const enrollment = await Enrollment.findOne({
    where:   { user_id: userId, course_id: courseId },
    include: [
      { model: Squad,  as: 'squad',  attributes: ['id', 'number', 'victim_code'] },
      { model: Cohort, as: 'cohort', attributes: ['id', 'scenario_name'] },
    ],
  });
  if (!enrollment) throw new ForbiddenError('Not enrolled in this course');

  const studentSquadNumber = enrollment.squad?.number ?? null;
  const studentVictimCode  = enrollment.squad?.victim_code ?? null;
  // Normalized defensively (not just at write time) — scenario_name has
  // drifted into raw/unslugified form on more than one model historically,
  // and a strict-equality mismatch here silently hides every package.
  const cohortScenario     = normalizeScenarioName(enrollment.cohort?.scenario_name);

  const unlockedSet = new Set();
  if (enrollment.cohort_id) {
    const unlocks = await unlockListCache.get(
      `unlocks:${enrollment.cohort_id}`,
      () => ScenarioPackageUnlock.findAll({ where: { cohort_id: enrollment.cohort_id } })
    );
    unlocks.forEach((u) => unlockedSet.add(u.package_id));
  }

  const packages = await packageListCache.get(
    `packages:${courseId}`,
    () => ScenarioPackage.findAll({
      where: { course_id: courseId, is_published: true },
      order: [['release_number', 'ASC']],
    })
  );

  // Show packages that are unlocked for the cohort, assigned to the student's
  // victim (falling back to the legacy squad_number check for packages
  // created before victim-based targeting existed), and match the cohort's
  // scenario if one is set.
  const unlocked = packages.filter(
    (p) =>
      unlockedSet.has(p.id) &&
      (p.victim_code == null
        ? (p.squad_number == null || p.squad_number === studentSquadNumber)
        : p.victim_code === studentVictimCode) &&
      (cohortScenario == null || normalizeScenarioName(p.scenario_name) === cohortScenario)
  );

  return unlocked.map((p) => ({ ...p.toJSON(), is_unlocked: true }));
}

async function listForAdmin(courseId, { includeUnpublished = false } = {}) {
  await r2SyncCache.get(`sync:${courseId}`, () => syncFromR2(courseId));
  const where = { course_id: courseId };
  if (!includeUnpublished) where.is_published = true;
  return ScenarioPackage.findAll({
    where,
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

  const files = await getFilesForPackage(pkg, true); // presigned URLs for students
  return { files };
}

/* Admin: list files for any package regardless of unlock status */
async function getFilesAdmin(packageId) {
  const pkg = await ScenarioPackage.findByPk(packageId);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  const files = await getFilesForPackage(pkg, true); // presigned URLs for admin too
  return { files };
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  const pkg = await ScenarioPackage.create({
    ...data,
    course_id: courseId,
    ...(Object.hasOwn(data, 'scenario_name') ? { scenario_name: normalizeScenarioName(data.scenario_name) } : {}),
  });
  packageListCache.invalidate(`packages:${courseId}`);
  return pkg;
}

async function update(id, data) {
  const pkg = await ScenarioPackage.findByPk(id);
  if (!pkg) throw new NotFoundError('ScenarioPackage');
  packageListCache.invalidate(`packages:${pkg.course_id}`);
  return pkg.update({
    ...data,
    ...(Object.hasOwn(data, 'scenario_name') ? { scenario_name: normalizeScenarioName(data.scenario_name) } : {}),
  });
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
  unlockListCache.invalidate(`unlocks:${cohortId}`);
  return unlock;
}

async function lockForCohort(packageId, cohortId) {
  await ScenarioPackageUnlock.destroy({ where: { package_id: packageId, cohort_id: cohortId } });
  unlockListCache.invalidate(`unlocks:${cohortId}`);
}

/* Browse one level of R2 at the given prefix (delimiter = '/') */
async function browseR2(prefix) {
  const cmd = new ListObjectsV2Command({
    Bucket:    R2_BUCKET,
    Prefix:    prefix || undefined,
    Delimiter: '/',
  });
  const resp = await r2Client.send(cmd);
  return {
    prefix,
    folders: (resp.CommonPrefixes ?? []).map((cp) => ({
      prefix: cp.Prefix,
      name:   cp.Prefix.slice(prefix.length).replace(/\/$/, ''),
    })),
    files: (resp.Contents ?? [])
      .filter((obj) => obj.Key !== prefix)
      .map((obj) => ({
        key:  obj.Key,
        name: obj.Key.slice(prefix.length),
        url:  `${R2_PUBLIC_BASE_URL}/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified,
      })),
  };
}

/* Return a presigned PUT URL for direct browser-to-R2 upload */
async function getPresignedUploadUrl(key, contentType) {
  const cmd = new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         key,
    ContentType: contentType || 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 3600 });
  return { uploadUrl, key };
}

/* Delete a single object from R2 */
async function deleteR2Object(key) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/*
  Quick-release: create a ScenarioPackage (folder or single file) and
  immediately unlock it for the specified cohort. Assigns release_number
  as max(existing) + 1 across the course.
*/
async function quickRelease(courseId, cohortId, { r2_key, title, scenario_name, squad_number, drop_number, victim_code, unlocker_id, description }) {
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new (require('../utils/errors').NotFoundError)('Cohort');

  const max = await ScenarioPackage.max('release_number', { where: { course_id: courseId } });
  const release_number = (max ?? 0) + 1;

  const file_name = r2_key.replace(/\/$/, '').split('/').pop();

  const pkg = await ScenarioPackage.create({
    course_id:      courseId,
    title:          title || file_name,
    scenario_name:  normalizeScenarioName(scenario_name || title || file_name),
    description:    description || null,
    file_name,
    r2_key,
    release_number,
    squad_number:   squad_number ?? null,
    drop_number:    drop_number ?? null,
    victim_code:    victim_code ?? null,
    is_published:   true,
  });

  await ScenarioPackageUnlock.findOrCreate({
    where:    { package_id: pkg.id, cohort_id: cohortId },
    defaults: { unlocked_by: unlocker_id ?? null, unlocked_at: new Date() },
  });

  packageListCache.invalidate(`packages:${courseId}`);
  unlockListCache.invalidate(`unlocks:${cohortId}`);
  return pkg;
}

module.exports = {
  listForStudent, listForAdmin, getDownloadUrl, getFilesAdmin,
  create, update, remove, unlockForCohort, lockForCohort,
  browseR2, getPresignedUploadUrl, deleteR2Object, quickRelease,
  normalizeScenarioName, invalidatePackageLists,
};
