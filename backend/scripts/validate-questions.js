'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});
(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(
    `SELECT title, type, questions FROM assignments WHERE jsonb_array_length(questions) > 0`
  );
  let issues = 0;
  for (const row of rows) {
    const qs = row.questions;
    const ids = new Set();
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const problems = [];
      if (!q.id)                          problems.push('missing id');
      if (ids.has(q.id))                  problems.push(`duplicate id: ${q.id}`);
      if (q.id) ids.add(q.id);
      if (q.scoring == null)              problems.push('missing scoring');
      if (q.scoring?.points == null)      problems.push('missing scoring.points');
      if (!q.payload?.kind)               problems.push('missing payload.kind');
      if (!q.stem?.en)                    problems.push('missing stem.en');
      if (problems.length) {
        console.log(`[${row.type}] "${row.title}" Q${i}: ${problems.join(', ')}`);
        issues++;
      }
    }
  }
  if (issues === 0) console.log('All questions valid — no structural issues found.');
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
