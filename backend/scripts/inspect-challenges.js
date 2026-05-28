'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(`SELECT title, description, questions, grading_mode, max_score FROM assignments WHERE type = 'challenge' ORDER BY order_index`);
  rows.forEach(r => {
    console.log('\n════ ' + r.title);
    console.log('grading_mode:', r.grading_mode, '| max_score:', r.max_score);
    console.log('description:\n', r.description);
    console.log('questions:', JSON.stringify(r.questions, null, 2));
  });
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
