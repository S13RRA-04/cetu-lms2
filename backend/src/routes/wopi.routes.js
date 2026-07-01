'use strict';
const { Router } = require('express');
const { GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET } = require('../config/r2');
const { CourseContentItem } = require('../models');

const router = Router();

async function findItem(id) {
  return CourseContentItem.findOne({
    where: { id, is_published: true },
    attributes: ['id', 'file_name', 'file_size', 'r2_key'],
  });
}

// CheckFileInfo
router.get('/files/:id', async (req, res, next) => {
  try {
    const item = await findItem(req.params.id);
    if (!item?.r2_key) return res.status(404).end();

    let size = item.file_size || 0;
    if (!size) {
      try {
        const head = await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: item.r2_key }));
        size = head.ContentLength || 0;
      } catch {}
    }

    return res.json({
      BaseFileName:        item.file_name || item.r2_key.split('/').pop(),
      Size:                size,
      UserId:              'anonymous',
      Version:             String(item.id),
      ReadOnly:            true,
      UserCanWrite:        false,
      DisableTranslation:  true,
    });
  } catch (err) { return next(err); }
});

// GetFile
router.get('/files/:id/contents', async (req, res, next) => {
  try {
    const item = await findItem(req.params.id);
    if (!item?.r2_key) return res.status(404).end();

    const obj = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: item.r2_key }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    if (obj.ContentLength) res.setHeader('Content-Length', String(obj.ContentLength));
    res.setHeader('X-WOPI-ItemVersion', String(item.id));
    obj.Body.pipe(res);
  } catch (err) { return next(err); }
});

module.exports = router;
