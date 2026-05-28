'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(
    `SELECT title, type, description, grading_mode FROM assignments WHERE type IN ('challenge','capstone') ORDER BY order_index`
  );
  rows.forEach(r => {
    console.log(`\n[${r.type}] ${r.title} (${r.grading_mode})`);
    console.log(r.description);
  });
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
