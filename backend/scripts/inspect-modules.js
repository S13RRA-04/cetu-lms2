'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(`
    SELECT title, description, questions, grading_mode, max_score, lti_resource_link_id
    FROM assignments
    WHERE type = 'module'
    ORDER BY order_index
    LIMIT 6
  `);
  rows.forEach(r => {
    console.log('\n════ ' + r.title);
    console.log('grading_mode:', r.grading_mode, '| max_score:', r.max_score, '| lti_id:', r.lti_resource_link_id);
    console.log('description:\n', r.description);
    const qs = Array.isArray(r.questions) ? r.questions : [];
    console.log('questions count:', qs.length);
    if (qs.length > 0) console.log('first question:', JSON.stringify(qs[0], null, 2));
  });
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
