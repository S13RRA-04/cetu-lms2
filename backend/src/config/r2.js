'use strict';
const { S3Client } = require('@aws-sdk/client-s3');

const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT          = process.env.R2_ENDPOINT;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  const missing = [
    !R2_ENDPOINT          && 'R2_ENDPOINT',
    !R2_ACCESS_KEY_ID     && 'R2_ACCESS_KEY_ID',
    !R2_SECRET_ACCESS_KEY && 'R2_SECRET_ACCESS_KEY',
  ].filter(Boolean).join(', ');
  console.warn(`[r2] Missing environment variable(s): ${missing}. R2 operations will fail.`);
}

const r2Client = new S3Client({
  region:      'auto',
  endpoint:    R2_ENDPOINT,
  credentials: {
    accessKeyId:     R2_ACCESS_KEY_ID     ?? '',
    secretAccessKey: R2_SECRET_ACCESS_KEY ?? '',
  },
});

const R2_BUCKET       = process.env.R2_BUCKET       ?? 'pact';
const R2_DECKS_PREFIX = process.env.R2_DECKS_PREFIX ?? 'scenarios/';

module.exports = { r2Client, R2_BUCKET, R2_DECKS_PREFIX };
