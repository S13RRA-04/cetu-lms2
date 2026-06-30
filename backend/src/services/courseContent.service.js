'use strict';
const { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET, R2_SLIDES_PREFIX } = require('../config/r2');
const { CourseContentItem, CourseContentUnlock, Course, Cohort, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
if (!R2_PUBLIC_BASE_URL) {
  console.warn('[courseContent] R2_PUBLIC_BASE_URL is not set — slide deck download URLs will be broken relative paths');
}
const CONTENT_PREFIX     = 'course-content/';

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
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  if (!enrollment) throw new ForbiddenError('Not enrolled');

  const unlockedSet = new Set();
  if (enrollment.cohort_id) {
    const unlocks = await CourseContentUnlock.findAll({ where: { cohort_id: enrollment.cohort_id } });
    unlocks.forEach((u) => unlockedSet.add(u.content_id));
  }

  const items = await CourseContentItem.findAll({
    where: { course_id: courseId, is_published: true },
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  return items.map((item) => {
    const unlocked = unlockedSet.has(item.id);
    return {
      ...item.toJSON(),
      is_unlocked:  unlocked,
      download_url: unlocked && item.r2_key ? `${R2_PUBLIC_BASE_URL}/${item.r2_key}` : (unlocked ? item.url : null),
    };
  });
}

async function listForAdmin(courseId) {
  const items = await CourseContentItem.findAll({
    where:   { course_id: courseId },
    include: [{ model: CourseContentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    order:   [['order_index', 'ASC'], ['created_at', 'ASC']],
  });
  return items.map((item) => ({
    ...item.toJSON(),
    download_url: item.r2_key ? `${R2_PUBLIC_BASE_URL}/${item.r2_key}` : item.url,
  }));
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

  return CourseContentItem.create({
    course_id:    courseId,
    title:        data.title,
    description:  data.description,
    content_type: data.content_type ?? 'resource',
    order_index:  Number(data.order_index  ?? 0),
    is_published: data.is_published === true || data.is_published === 'true',
    drop_number:          data.drop_number          ? Number(data.drop_number) : null,
    linked_assignment_id: data.linked_assignment_id ?? null,
    url,
    r2_key:    r2Key,
    file_name: fileName ?? data.file_name ?? null,
    file_size: fileSize ?? (data.file_size ? Number(data.file_size) : null),
  });
}

async function getDownloadUrl(contentId, userId, userRole = 'student') {
  const item = await CourseContentItem.findByPk(contentId);
  if (!item) throw new NotFoundError('CourseContentItem');

  if (userRole === 'student') {
    const { Enrollment: EnrollmentModel } = require('../models');
    const enrollment = await EnrollmentModel.findOne({
      where: { user_id: userId, course_id: item.course_id },
    });
    if (!enrollment) throw new ForbiddenError('Not enrolled');

    if (enrollment.cohort_id) {
      const unlock = await CourseContentUnlock.findOne({
        where: { content_id: contentId, cohort_id: enrollment.cohort_id },
      });
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
  return item.update(data);
}

async function remove(id) {
  const item = await CourseContentItem.findByPk(id);
  if (!item) throw new NotFoundError('CourseContentItem');
  if (item.r2_key) {
    try { await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: item.r2_key })); } catch {}
  }
  await item.destroy();
}

async function unlockForCohort(contentId, cohortId, unlockerId) {
  const item   = await CourseContentItem.findByPk(contentId);
  if (!item) throw new NotFoundError('CourseContentItem');
  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');
  const [unlock] = await CourseContentUnlock.findOrCreate({
    where:    { content_id: contentId, cohort_id: cohortId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });
  return unlock;
}

async function lockForCohort(contentId, cohortId) {
  await CourseContentUnlock.destroy({ where: { content_id: contentId, cohort_id: cohortId } });
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
  const allKeys = [];
  let continuationToken;

  do {
    const resp = await r2Client.send(new ListObjectsV2Command({
      Bucket:             R2_BUCKET,
      Prefix:             prefix,
      ContinuationToken:  continuationToken,
    }));
    for (const obj of resp.Contents ?? []) {
      if (obj.Key !== prefix) allKeys.push(obj.Key);
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  if (allKeys.length === 0) return { added: 0, skipped: 0, total: 0 };

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
      url:          correctUrl(key),
      is_published: false,
      order_index:  0,
    })
  ));

  return { added: toCreate.length, skipped: existingByKey.size - existing.filter((e) => e.url !== correctUrl(e.r2_key)).length, total: allKeys.length };
}

module.exports = { listForStudent, listForAdmin, create, update, remove, unlockForCohort, lockForCohort, getDownloadUrl, syncDecks };
