'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(`SELECT questions->0 AS q FROM assignments WHERE title='Day 1 Lecture 1'`);
  console.log('First question of Day 1 Lecture 1:');
  console.log(JSON.stringify(rows[0].q, null, 2));
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
