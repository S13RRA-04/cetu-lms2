'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

(async () => {
  await seq.authenticate();
  console.log('Connected.\n');

  await seq.query('ALTER TABLE assignments ADD COLUMN IF NOT EXISTS scenario_name VARCHAR(255) DEFAULT NULL');
  console.log('Column scenario_name added (or already exists).');

  const [, meta] = await seq.query(
    "UPDATE assignments SET scenario_name = 'brokered-exit' WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  console.log('Challenges updated:', meta.rowCount ?? '?');

  const [[row]] = await seq.query(
    "SELECT COUNT(*) AS n FROM assignments WHERE scenario_name = 'brokered-exit'",
  );
  console.log('Total challenges tagged brokered-exit:', row.n);

  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
