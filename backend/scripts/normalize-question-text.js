'use strict';
/**
 * Flatten { en: "string" } i18n wrappers in the questions JSONB column.
 *
 * MongoDB questions were stored with multilingual wrappers like
 *   stem: { en: "What does R0 establish?" }
 *   options[].text: { en: "Some option text" }
 *   feedback.correct: { en: "Correct — because…" }
 *
 * After this migration every text field is a plain string.  The rule is
 * simple: any object whose ONLY key is "en" and whose value is a string
 * is replaced by that string.  All other objects/arrays are recursed into.
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

/* Recursively unwrap { en: "…" } singletons */
function flatten(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object')             return value;   // string, number, bool
  if (Array.isArray(value))                  return value.map(flatten);

  const keys = Object.keys(value);

  /* The only case we unwrap: exactly one key that is "en" with a string value */
  if (keys.length === 1 && keys[0] === 'en' && typeof value.en === 'string') {
    return value.en;
  }

  /* Otherwise recurse into every field */
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = flatten(v);
  return out;
}

(async () => {
  await seq.authenticate();
  console.log('Connected.\n');

  const [rows] = await seq.query(`
    SELECT id, title, type, questions
    FROM   assignments
    WHERE  jsonb_array_length(questions) > 0
    ORDER  BY order_index
  `);

  console.log(`Found ${rows.length} assignments with questions.\n`);

  let updated = 0;
  for (const row of rows) {
    const original  = JSON.stringify(row.questions);
    const flattened = row.questions.map(flatten);
    const result    = JSON.stringify(flattened);

    if (original === result) {
      console.log(`  [skip]    ${row.title}`);
      continue;
    }

    await seq.query(
      `UPDATE assignments SET questions = :q::jsonb WHERE id = :id`,
      { replacements: { q: result, id: row.id } }
    );

    console.log(`  [updated] ${row.title}`);
    updated++;
  }

  console.log(`\nDone — ${updated} assignment(s) updated, ${rows.length - updated} already flat.`);
  await seq.close();
})().catch(e => { console.error(e); process.exit(1); });
