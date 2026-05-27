'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});

(async () => {
  await seq.authenticate();
  // Delete the empty shell rows that had no lti_resource_link_id (no questions).
  // Keep the migration-created rows that have a proper lti_resource_link_id.
  const [deleted] = await seq.query(
    `DELETE FROM assignments
     WHERE type IN ('assessment','survey')
       AND lti_resource_link_id IS NULL
     RETURNING title, id`,
  );
  console.log(`Deleted ${deleted.length} duplicate shell row(s):`);
  deleted.forEach((r) => console.log(' -', r.title, `(${r.id})`));
  await seq.close();
})().catch((e) => { console.error(e); process.exit(1); });
