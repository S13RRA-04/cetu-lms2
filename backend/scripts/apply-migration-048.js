'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

(async () => {
  await seq.authenticate();
  await seq.query('ALTER TABLE grades ADD COLUMN IF NOT EXISTS prompt_scores JSONB DEFAULT NULL');
  await seq.query("INSERT INTO \"SequelizeMeta\" (name) VALUES ('20240101000048-add-prompt-scores-to-grades.js') ON CONFLICT DO NOTHING");
  console.log('prompt_scores column added to grades');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
