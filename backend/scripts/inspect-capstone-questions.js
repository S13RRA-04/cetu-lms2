'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(
    `SELECT title, questions FROM assignments WHERE type='capstone' AND jsonb_array_length(questions)>0 LIMIT 1`
  );
  const r = rows[0];
  console.log('title:', r.title, '| q count:', r.questions.length);
  r.questions.slice(0, 4).forEach((q, i) => {
    console.log(`\n--- Q${i}`);
    console.log('  id:', q.id);
    console.log('  type:', q.type);
    console.log('  payload.kind:', q.payload?.kind);
    console.log('  scoring:', JSON.stringify(q.scoring));
    console.log('  stem:', q.stem?.en?.slice(0, 80));
  });
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
