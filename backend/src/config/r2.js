'use strict';
const { S3Client } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
  region:      'auto',
  endpoint:    process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET        = process.env.R2_BUCKET        ?? 'pact';
const R2_DECKS_PREFIX  = process.env.R2_DECKS_PREFIX  ?? 'decks/';

module.exports = { r2Client, R2_BUCKET, R2_DECKS_PREFIX };
