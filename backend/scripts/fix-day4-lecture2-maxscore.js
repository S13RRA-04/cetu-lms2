'use strict';
/**
 * Day 4 Lecture 2 has no owning seeder file (created directly via the admin
 * UI) — its max_score (36) didn't match the sum of its own question points
 * (40), same bug class as the Day 5 max_score fix. One-off direct correction.
 *
 * Run: node backend/scripts/fix-day4-lecture2-maxscore.js
 */
require('dotenv').config();
const { Assignment } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

async function main() {
  const a = await Assignment.findOne({ where: { course_id: COURSE_ID, title: 'Day 4 Lecture 2' } });
  if (!a) { console.log('Not found.'); return; }
  const qSum = (a.questions ?? []).reduce((s, q) => s + (Number(q.scoring?.points) || 0), 0);
  console.log(`Current max_score: ${Number(a.max_score)}, question point sum: ${qSum}`);
  await a.update({ max_score: qSum });
  console.log(`Updated max_score to ${qSum}.`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };
