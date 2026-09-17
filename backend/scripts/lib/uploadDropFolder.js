'use strict';
/**
 * Shared upload helper for the PACKET HEIST v2 (Packets 1-4) setup scripts.
 * Recursively walks a local source directory and uploads every recognized
 * device-native evidence file to R2, flattened to one filename per key
 * under the given prefix — matching r2CaseFile.js's one-folder-level
 * convention (scenarios/<scenario>/Drop <N>/[<victim>/]<file>).
 *
 * Source-only files (instructor manifests, .zip wrappers already extracted
 * in place, any other doc type) are skipped by extension/name rather than
 * uploaded and later ignored, so R2 only ever holds what the app can serve.
 */

const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET } = require('../../src/config/r2');

// Mirrors CASE_FILE_EXTENSIONS in backend/src/utils/r2CaseFile.js.
const CASE_FILE_EXTENSIONS = new Set(['pdf', 'csv', 'txt', 'eml', 'json', 'html', 'log']);

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  eml: 'message/rfc822',
  json: 'application/json',
  html: 'text/html',
  log: 'text/plain',
};

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  }
  return results;
}

function findEvidenceFiles(localDir) {
  return walk(localDir).filter((file) => {
    const base = path.basename(file);
    if (base.startsWith('_INSTRUCTOR_')) return false;
    const ext = path.extname(file).slice(1).toLowerCase();
    return CASE_FILE_EXTENSIONS.has(ext);
  });
}

/** Uploads every recognized file under localDir to r2Prefix + <basename>. */
async function uploadFlattened(localDir, r2Prefix) {
  const files = findEvidenceFiles(localDir);
  for (const file of files) {
    const ext = path.extname(file).slice(1).toLowerCase();
    const key = `${r2Prefix}${path.basename(file)}`;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fs.readFileSync(file),
      ContentType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
    }));
  }
  return files.map((file) => path.basename(file));
}

/** Uploads a single local file to the given R2 key. */
async function uploadFile(localFile, r2Key) {
  const ext = path.extname(localFile).slice(1).toLowerCase();
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    Body: fs.readFileSync(localFile),
    ContentType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
  }));
}

module.exports = { uploadFlattened, uploadFile, findEvidenceFiles, walk, CASE_FILE_EXTENSIONS };
