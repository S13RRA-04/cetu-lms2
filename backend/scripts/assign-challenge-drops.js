'use strict';
/**
 * One-shot script: assigns drop_number to every PACT challenge assignment
 * based on the Brokered Exit scenario structure (6 drops).
 *
 * Run: node backend/scripts/assign-challenge-drops.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

// Map title substring → drop number.
// Evaluated in order; first match wins.
const DROP_RULES = [
  // Drop 1 — Day 1 case-team orientation + squad threat-landscape workshops
  { match: /case.team triad/i,                  drop: 1 },
  { match: /anyproxy/i,                         drop: 1 },
  { match: /qakbot/i,                           drop: 1 },
  { match: /irgc/i,                             drop: 1 },
  { match: /hafnium/i,                          drop: 1 },

  // Drop 2 — Day 2 AM Brokered Exit Synthesis Worksheet
  { match: /day 2 am.*brokered exit/i,          drop: 2 },
  { match: /brokered exit synthesis/i,          drop: 2 },

  // Drop 3 — Day 3 AM Forensic Correlation
  { match: /day 3 am.*forensic/i,               drop: 3 },
  { match: /forensic correlation/i,             drop: 3 },

  // Drop 4 — Day 4 AM Attribution Synthesis
  { match: /day 4 am.*attribution/i,            drop: 4 },
  { match: /^day 4 am workshop/i,               drop: 4 },

  // Drop 5 — Day 4 PM Toolbox-to-Attribution Synthesis
  { match: /day 4 pm.*toolbox/i,                drop: 5 },
  { match: /toolbox.to.attribution/i,           drop: 5 },
  { match: /^day 4 pm workshop/i,               drop: 5 },

  // Drop 6 — Final Brokered Exit disposition
  { match: /^brokered exit$/i,                  drop: 6 },
];

function resolveDropNumber(title) {
  for (const rule of DROP_RULES) {
    if (rule.match.test(title)) return rule.drop;
  }
  return null;
}

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  const [challenges] = await seq.query(
    `SELECT id, title, drop_number FROM assignments
     WHERE course_id = :courseId AND type = 'challenge'
     ORDER BY order_index`,
    { replacements: { courseId: COURSE_ID } },
  );

  if (!challenges.length) {
    console.warn('No challenge assignments found for this course.');
    await seq.close();
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const row of challenges) {
    const target = resolveDropNumber(row.title);

    if (target === null) {
      console.warn(`  SKIP  "${row.title}" — no matching rule`);
      skipped++;
      continue;
    }

    if (row.drop_number === target) {
      console.log(`  OK    [Drop ${target}] "${row.title}" (already set)`);
      skipped++;
      continue;
    }

    await seq.query(
      `UPDATE assignments SET drop_number = :drop, updated_at = NOW()
       WHERE id = :id`,
      { replacements: { drop: target, id: row.id } },
    );
    console.log(`  SET   [Drop ${target}] "${row.title}"`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
  await seq.close();
})().catch((e) => { console.error(e); process.exit(1); });
