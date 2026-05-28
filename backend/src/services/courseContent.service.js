'use strict';
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET } = require('../config/r2');
const { CourseContentItem, CourseContentUnlock, Course, Cohort, Enrollment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
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
  return CourseContentItem.findAll({
    where:   { course_id: courseId },
    include: [{ model: CourseContentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    order:   [['order_index', 'ASC'], ['created_at', 'ASC']],
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
    url = data.url;
  }

  return CourseContentItem.create({
    course_id:    courseId,
    title:        data.title,
    description:  data.description,
    content_type: data.content_type ?? 'resource',
    order_index:  data.order_index  ?? 0,
    is_published: data.is_published ?? false,
    url, r2Key, file_name: fileName ?? data.file_name, file_size: fileSize,
  });
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

module.exports = { listForStudent, listForAdmin, create, update, remove, unlockForCohort, lockForCohort };
