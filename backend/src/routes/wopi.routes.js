'use strict';
const https  = require('https');
const http   = require('http');
const { Router } = require('express');
const { CourseContentItem } = require('../models');
const logger = require('../utils/logger');

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

const router = Router();

async function findItem(id) {
  return CourseContentItem.findOne({
    where: { id, is_published: true },
    attributes: ['id', 'file_name', 'file_size', 'r2_key'],
  });
}

/* Fetch file metadata (HEAD) from the public R2 CDN URL */
function headR2(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.request(url, { method: 'HEAD' }, (res) => {
      resolve({ status: res.statusCode, contentLength: Number(res.headers['content-length']) || 0 });
      res.resume();
    }).on('error', (err) => {
      logger.warn('[WOPI] HEAD failed', { url, error: err.message });
      resolve({ status: 0, contentLength: 0 });
    }).end();
  });
}

/* Stream file content from the public R2 CDN URL */
function getR2Stream(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 400) {
        res.resume();
        return reject(Object.assign(new Error(`R2 fetch failed: ${res.statusCode}`), { statusCode: res.statusCode }));
      }
      resolve(res);
    }).on('error', reject);
  });
}

// CheckFileInfo
router.get('/files/:id', async (req, res, next) => {
  try {
    const item = await findItem(req.params.id);
    if (!item?.r2_key) return res.status(404).end();

    let size = Number(item.file_size) || 0;
    if (!size && R2_PUBLIC_BASE_URL) {
      const { contentLength } = await headR2(`${R2_PUBLIC_BASE_URL}/${item.r2_key}`);
      size = contentLength;
      if (size) item.update({ file_size: size }).catch(() => {});
    }

    return res.json({
      BaseFileName:       item.file_name || item.r2_key.split('/').pop(),
      Size:               size,
      UserId:             'anonymous',
      Version:            String(item.id),
      ReadOnly:           true,
      UserCanWrite:       false,
      DisableTranslation: true,
    });
  } catch (err) { return next(err); }
});

// GetFile
router.get('/files/:id/contents', async (req, res, next) => {
  try {
    const item = await findItem(req.params.id);
    if (!item?.r2_key) return res.status(404).end();

    if (!R2_PUBLIC_BASE_URL) {
      logger.error('[WOPI] R2_PUBLIC_BASE_URL not set — cannot serve file');
      return res.status(503).end();
    }

    const fileUrl = `${R2_PUBLIC_BASE_URL}/${item.r2_key}`;
    const stream  = await getR2Stream(fileUrl);

    const ext = (item.file_name || item.r2_key).split('.').pop().toLowerCase();
    const MIME = {
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt:  'application/vnd.ms-powerpoint',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf:  'application/pdf',
    };
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    if (stream.headers['content-length']) res.setHeader('Content-Length', stream.headers['content-length']);
    res.setHeader('X-WOPI-ItemVersion', String(item.id));

    stream.pipe(res);
  } catch (err) { return next(err); }
});

module.exports = router;
