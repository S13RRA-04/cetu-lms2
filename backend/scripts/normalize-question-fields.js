'use strict';
/**
 * Strip authoring-only metadata from questions JSONB that PACT never reads.
 *
 * Quiz questions (module / assessment / capstone / game) carry MongoDB-migration
 * leftovers that the frontend ignores entirely:
 *   top-level:  day, role, tags, topic, status, type, version,
 *               createdAt, updatedAt, supersedes
 *   scoring:    difficulty, gradingMode
 *
 * Survey question options carry a `score` field that SurveyFlow never reads.
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

const QUIZ_DROP_KEYS    = new Set(['day', 'role', 'tags', 'topic', 'status', 'type', 'version', 'createdAt', 'updatedAt', 'supersedes']);
const SCORING_DROP_KEYS = new Set(['difficulty', 'gradingMode']);

function normalizeQuizQuestion(q) {
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    if (QUIZ_DROP_KEYS.has(k)) continue;
    if (k === 'scoring' && v && typeof v === 'object') {
      const scoring = {};
      for (const [sk, sv] of Object.entries(v)) {
        if (!SCORING_DROP_KEYS.has(sk)) scoring[sk] = sv;
      }
      out.scoring = scoring;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function normalizeSurveyOption(opt) {
  if (!opt || typeof opt !== 'object') return opt;
  const { score: _unused, ...rest } = opt;
  return rest;
}

function normalizeSurveyQuestion(q) {
  if (!q || typeof q !== 'object') return q;
  if (!Array.isArray(q.options)) return q;
  return { ...q, options: q.options.map(normalizeSurveyOption) };
}

(async () => {
  await seq.authenticate();
  console.log('Connected.\n');

  const [rows] = await seq.query(`
    SELECT id, title, type, questions
    FROM   assignments
    WHERE  questions IS NOT NULL
      AND  jsonb_typeof(questions) = 'array'
      AND  jsonb_array_length(questions) > 0
    ORDER  BY order_index
  `);

  console.log(`Found ${rows.length} assignments with questions.\n`);

  let updated = 0;
  for (const row of rows) {
    const isSurvey   = row.type === 'survey';
    const original   = JSON.stringify(row.questions);

    const normalized = isSurvey
      ? row.questions.map(normalizeSurveyQuestion)
      : row.questions.map(normalizeQuizQuestion);

    const result = JSON.stringify(normalized);

    if (original === result) {
      console.log(`  [skip]    ${row.title}`);
      continue;
    }

    await seq.query(
      `UPDATE assignments SET questions = :q::jsonb WHERE id = :id`,
      { replacements: { q: result, id: row.id } },
    );

    console.log(`  [updated] ${row.title}`);
    updated++;
  }

  console.log(`\nDone — ${updated} updated, ${rows.length - updated} already clean.`);
  await seq.close();
})().catch((e) => { console.error(e); process.exit(1); });
