'use strict';
const { Op } = require('sequelize');
const { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET, R2_DECKS_PREFIX, R2_SLIDES_PREFIX } = require('../config/r2');
const { CourseContentItem, CourseContentUnlock, Course, Cohort, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');
const TtlCache = require('../utils/ttlCache');
const { parseDropCaseFile, scenarioSlugFromName } = require('../utils/r2CaseFile');
const { contentMatchesSquadVictim } = require('../utils/campaignRelease');
const { getStudentLocationCodes, locationMatches } = require('../utils/dropLocation');

const contentCache = new TtlCache(15_000);

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
if (!R2_PUBLIC_BASE_URL) {
  console.warn('[courseContent] R2_PUBLIC_BASE_URL is not set — slide deck download URLs will be broken relative paths');
}
const CONTENT_PREFIX     = 'course-content/';

function invalidateCourseContentLists(courseId) {
  contentCache.invalidate(`listForAdmin:all:${courseId}`);
  contentCache.invalidate(`listForAdmin:published:${courseId}`);
  contentCache.invalidate(`listItems:${courseId}`);
}

/* Upload a buffer to R2, returns the public URL */
async function uploadToR2(buffer, fileName, mimeType) {
  const ext    = fileName.split('.').pop() ?? 'bin';
  const r2Key  = `${CONTENT_PREFIX}${uuidv4()}.${ext}`;
  await r2Client.send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         r2Key,
    Body:        buffer,
    ContentType: mimeType ?? 'application/octet-stream',
  }));
  return { r2Key, url: `${R2_PUBLIC_BASE_URL}/${r2Key}` };
}

async function listForStudent(courseId, userId) {
  const enrollment = await Enrollment.findOne({
    where:   { user_id: userId, course_id: courseId },
    include: [{ association: 'squad', attributes: ['id', 'victim_code'] }],
  });
  if (!enrollment) throw new ForbiddenError('Not enrolled');

  // A content item is visible if unlocked cohort-wide (squad_id IS NULL) OR
  // specifically for this student's own squad — same OR-clause pattern used
  // for assignment unlocks (assignment.service.js's _queryListForStudent).
  const squadId   = enrollment.squad?.id ?? null;
  const orClauses = [{ cohort_id: enrollment.cohort_id, squad_id: null }];
  if (squadId) orClauses.push({ cohort_id: enrollment.cohort_id, squad_id: squadId });

  // Items list is the same for all students in a course; cohort/squad scopes unlock visibility
  const [items, unlocks] = await Promise.all([
    contentCache.get(`listItems:${courseId}`, () => CourseContentItem.findAll({
      where: { course_id: courseId, is_published: true },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']],
    })),
    enrollment.cohort_id
      ? CourseContentUnlock.findAll({ where: { [Op.or]: orClauses } })
      : Promise.resolve([]),
  ]);

  const locationCodes = await getStudentLocationCodes(courseId, userId);
  const unlockedSet = new Set(unlocks.map((u) => u.content_id));
  return items.map((item) => {
    const unlocked = unlockedSet.has(item.id)
      && contentMatchesSquadVictim(item.victim_code, enrollment.squad?.victim_code ?? null)
      && locationMatches(item, locationCodes);
    return {
      ...item.toJSON(),
      is_unlocked:  unlocked,
      download_url: unlocked && item.r2_key ? `${R2_PUBLIC_BASE_URL}/${item.r2_key}` : (unlocked ? item.url : null),
    };
  });
}

async function listForAdmin(courseId, { includeUnpublished = false } = {}) {
  const cacheKey = includeUnpublished ? `listForAdmin:all:${courseId}` : `listForAdmin:published:${courseId}`;
  return contentCache.get(cacheKey, async () => {
    const where = { course_id: courseId };
    if (!includeUnpublished) where.is_published = true;

    const items = await CourseContentItem.findAll({
      where,
      include: [{ model: CourseContentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
      order:   [['order_index', 'ASC'], ['created_at', 'ASC']],
    });
    return items.map((item) => ({
      ...item.toJSON(),
      download_url: item.r2_key ? `${R2_PUBLIC_BASE_URL}/${item.r2_key}` : item.url,
    }));
  });
}

async function create(courseId, data, fileBuffer, fileName, mimeType) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  let r2Key, url, fileSize;
  if (fileBuffer) {
    const upload = await uploadToR2(fileBuffer, fileName, mimeType);
    r2Key    = upload.r2Key;
    url      = upload.url;
    fileSize = fileBuffer.length;
  } else {
    url   = data.url;
    r2Key = data.r2_key ?? null;
  }

  const item = await CourseContentItem.create({
    course_id:    courseId,
    title:        data.title,
    description:  data.description ?? null,
    content_type: data.content_type ?? 'resource',
    order_index:  Number(data.order_index  ?? 0),
    is_published: data.is_published === true || data.is_published === 'true',
    url,
    r2_key:    r2Key,
    file_name: fileName ?? data.file_name ?? null,
    file_size: fileSize ?? (data.file_size ? Number(data.file_size) : null),
    ...(data.drop_number != null          ? { drop_number:          Number(data.drop_number) } : {}),
    ...(data.linked_assignment_id != null ? { linked_assignment_id: data.linked_assignment_id } : {}),
  });
  invalidateCourseContentLists(courseId);
  return item;
}

async function getDownloadUrl(contentId, userId, userRole = 'student') {
  const item = await CourseContentItem.findByPk(contentId);
  if (!item) throw new NotFoundError('CourseContentItem');

  if (userRole === 'student') {
    const { Enrollment: EnrollmentModel } = require('../models');
    const enrollment = await EnrollmentModel.findOne({
      where:   { user_id: userId, course_id: item.course_id },
      include: [{ association: 'squad', attributes: ['id', 'victim_code'] }],
    });
    if (!enrollment) throw new ForbiddenError('Not enrolled');

    if (!contentMatchesSquadVictim(item.victim_code, enrollment.squad?.victim_code ?? null)) {
      throw new ForbiddenError('Content is assigned to a different investigation target');
    }
    const locationCodes = await getStudentLocationCodes(item.course_id, userId);
    if (!locationMatches(item, locationCodes)) {
      throw new ForbiddenError('Content is assigned to a different search location');
    }

    if (enrollment.cohort_id) {
      const squadId   = enrollment.squad?.id ?? null;
      const orClauses = [{ content_id: contentId, cohort_id: enrollment.cohort_id, squad_id: null }];
      if (squadId) orClauses.push({ content_id: contentId, cohort_id: enrollment.cohort_id, squad_id: squadId });
      const unlock = await CourseContentUnlock.findOne({ where: { [Op.or]: orClauses } });
      if (!unlock) throw new ForbiddenError('Content not yet released for your cohort');
    }
  }

  const url = item.r2_key
    ? `${R2_PUBLIC_BASE_URL}/${item.r2_key}`
    : item.url;
  if (!url) throw new NotFoundError('No download URL configured for this item');
  return url;
}

async function update(id, data) {
  const item = await CourseContentItem.findByPk(id);
  if (!item) throw new NotFoundError('CourseContentItem');
  const updated = await item.update(data);
  invalidateCourseContentLists(item.course_id);
  return updated;
}

async function remove(id) {
  const item = await CourseContentItem.findByPk(id);
  if (!item) throw new NotFoundError('CourseContentItem');
  if (item.r2_key) {
    try { await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: item.r2_key })); } catch {}
  }
  const courseId = item.course_id;
  await item.destroy();
  invalidateCourseContentLists(courseId);
}

async function unlockForCohort(contentId, cohortId, unlockerId, squadId = null) {
  const item   = await CourseContentItem.findByPk(contentId);
  if (!item) throw new NotFoundError('CourseContentItem');
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');
  const [unlock] = await CourseContentUnlock.findOrCreate({
    where:    { content_id: contentId, cohort_id: cohortId, squad_id: squadId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });
  invalidateCourseContentLists(item.course_id);
  return unlock;
}

async function lockForCohort(contentId, cohortId, squadId = null) {
  const item = await CourseContentItem.findByPk(contentId);
  await CourseContentUnlock.destroy({ where: { content_id: contentId, cohort_id: cohortId, squad_id: squadId } });
  if (item) invalidateCourseContentLists(item.course_id);
}

function titleFromKey(key, prefix) {
  return key
    .slice(prefix.length)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function syncDecks(courseId) {
  const prefix = R2_SLIDES_PREFIX;
  const allObjects = [];
  let continuationToken;

  do {
    const resp = await r2Client.send(new ListObjectsV2Command({
      Bucket:             R2_BUCKET,
      Prefix:             prefix,
      ContinuationToken:  continuationToken,
    }));
    for (const obj of resp.Contents ?? []) {
      if (obj.Key !== prefix) allObjects.push({ key: obj.Key, size: obj.Size ?? null });
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  if (allObjects.length === 0) return { added: 0, skipped: 0, total: 0 };

  const allKeys = allObjects.map((o) => o.key);
  const sizeByKey = new Map(allObjects.map((o) => [o.key, o.size]));

  const existing = await CourseContentItem.findAll({
    where:      { course_id: courseId, r2_key: allKeys },
    attributes: ['id', 'r2_key', 'url'],
  });
  const existingByKey = new Map(existing.map((e) => [e.r2_key, e]));

  const correctUrl = (key) => `${R2_PUBLIC_BASE_URL}/${key}`;

  // Update URL on any existing record whose stored URL is now wrong (e.g. after env var change)
  await Promise.all(existing
    .filter((e) => e.url !== correctUrl(e.r2_key))
    .map((e) => e.update({ url: correctUrl(e.r2_key) }))
  );

  const toCreate = allKeys.filter((k) => !existingByKey.has(k));
  await Promise.all(toCreate.map((key) =>
    CourseContentItem.create({
      course_id:    courseId,
      title:        titleFromKey(key, prefix),
      content_type: 'slides',
      r2_key:       key,
      file_name:    key.split('/').pop(),
      file_size:    sizeByKey.get(key) ?? null,
      url:          correctUrl(key),
      is_published: false,
      order_index:  0,
    })
  ));

  return { added: toCreate.length, skipped: existingByKey.size - existing.filter((e) => e.url !== correctUrl(e.r2_key)).length, total: allObjects.length };
}

async function syncDropCaseFiles(courseId, { scenarioName, dropNumber }) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const selectedScenario = scenarioName ? scenarioSlugFromName(scenarioName) : null;

  const objects = [];
  let continuationToken;
  do {
    const response = await r2Client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: R2_DECKS_PREFIX,
      ContinuationToken: continuationToken,
    }));
    for (const object of response.Contents ?? []) {
      const parsed = parseDropCaseFile(object.Key, R2_DECKS_PREFIX);
      const matchesSelection = !selectedScenario || (parsed?.scenarioName === selectedScenario && parsed?.dropNumber === dropNumber);
      if (parsed && matchesSelection) {
        objects.push({ ...parsed, size: object.Size ?? null });
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  if (objects.length === 0) {
    return { scenario_name: selectedScenario, drop_number: dropNumber ?? null, added: 0, skipped: 0, updated: 0, total: 0 };
  }

  const keys = objects.map((object) => object.key);
  const objectByKey = new Map(objects.map((object) => [object.key, object]));
  const existing = await CourseContentItem.findAll({
    where: { course_id: courseId, r2_key: keys },
    attributes: ['id', 'r2_key', 'url', 'file_size', 'scenario_name', 'source_drop_number', 'source_victim_code', 'source_folder', 'is_published'],
  });
  const existingByKey = new Map(existing.map((item) => [item.r2_key, item]));
  const publicUrl = (key) => `${R2_PUBLIC_BASE_URL}/${key}`;

  let updated = 0;
  for (const item of existing) {
    const source = objectByKey.get(item.r2_key);
    const changes = {};
    if (item.url !== publicUrl(item.r2_key)) changes.url = publicUrl(item.r2_key);
    if (source?.size != null && Number(item.file_size) !== source.size) changes.file_size = source.size;
    if (item.scenario_name !== source?.scenarioName) changes.scenario_name = source.scenarioName;
    if (item.source_drop_number !== source?.dropNumber) changes.source_drop_number = source?.dropNumber ?? null;
    if (item.source_victim_code !== source?.victimCode) changes.source_victim_code = source?.victimCode ?? null;
    if (item.source_folder !== source?.sourceFolder) changes.source_folder = source?.sourceFolder ?? null;
    // Older R2 syncs created draft records. They could receive an unlock during
    // release but remained absent from the learner Case File's published query.
    if (item.is_published !== true) changes.is_published = true;
    if (Object.keys(changes).length > 0) {
      await item.update(changes);
      updated += 1;
    }
  }

  const newObjects = objects.filter((object) => !existingByKey.has(object.key));
  if (newObjects.length > 0) {
    await CourseContentItem.bulkCreate(newObjects.map((object) => ({
      course_id: courseId,
      title: object.title,
      description: object.description,
      content_type: object.contentType,
      r2_key: object.key,
      file_name: object.fileName,
      file_size: object.size,
      scenario_name: object.scenarioName,
      source_drop_number: object.dropNumber,
      source_victim_code: object.victimCode,
      source_folder: object.sourceFolder,
      url: publicUrl(object.key),
      drop_number: null,
      victim_code: null,
      // Visibility is already gated by drop pairing + release (CourseContentUnlock),
      // matching manually-uploaded content's default — see PublishFileForm.
      is_published: true,
      order_index: 0,
    })));
  }

  invalidateCourseContentLists(courseId);
  return {
    scenario_name: selectedScenario,
    drop_number: dropNumber,
    added: newObjects.length,
    skipped: existing.length,
    updated,
    total: objects.length,
  };
}

module.exports = { listForStudent, listForAdmin, create, update, remove, unlockForCohort, lockForCohort, getDownloadUrl, syncDecks, syncDropCaseFiles, invalidateCourseContentLists };
