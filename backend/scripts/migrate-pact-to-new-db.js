'use strict';
/**
 * One-time data copy: PACT's rows from the original (quota-exhausted) Neon
 * project into the new PACT-only Neon project (env NEON_PACT_DB). Read-only
 * against the source — never deletes or modifies anything there. The dest
 * database must already have the full migration history applied (see
 * `npx sequelize-cli db:migrate --env production` with DATABASE_URL swapped
 * to NEON_PACT_DB for that one-off run).
 *
 * `users` isn't course-scoped (one person can be enrolled in PACT and other
 * courses), so it's handled specially: only the subset of users actually
 * referenced by PACT's data gets copied into the new DB as reference data —
 * the source `users` table is untouched, other courses keep their rows.
 *
 * Explicitly excluded (see plan): refresh_tokens, password_reset_tokens
 * (session artifacts, will regenerate), audit_logs (polymorphic, not core
 * course data), all kcr_* tables (separate app, unverified live schema).
 *
 * Run: node backend/scripts/migrate-pact-to-new-db.js
 * Dry run (counts only, no writes to dest): node backend/scripts/migrate-pact-to-new-db.js --dry-run
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const PACT_COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DRY_RUN = process.argv.includes('--dry-run');

function connect(url, label) {
  if (!url) throw new Error(`${label} is not set`);
  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });
}

const source = connect(process.env.DATABASE_URL, 'DATABASE_URL');
const dest   = connect(process.env.NEON_PACT_DB, 'NEON_PACT_DB');

// One UNION query on the source to find every user_id PACT's data actually
// touches — direct enrollees plus every "actor" FK (grader, unlocker, first
// solver, self-reported location). Computed before any table copy so users
// can be inserted first (everything else FKs to them).
const NEEDED_USER_IDS_SQL = `
  SELECT DISTINCT user_id AS id FROM enrollments WHERE course_id = :pactId
  UNION
  SELECT DISTINCT s.user_id FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id WHERE a.course_id = :pactId
  UNION
  SELECT DISTINCT g.user_id FROM grades g
    JOIN assignments a ON a.id = g.assignment_id WHERE a.course_id = :pactId
  UNION
  SELECT DISTINCT g.graded_by FROM grades g
    JOIN assignments a ON a.id = g.assignment_id
    WHERE a.course_id = :pactId AND g.graded_by IS NOT NULL
  UNION
  SELECT DISTINCT au.unlocked_by FROM assignment_unlocks au
    JOIN assignments a ON a.id = au.assignment_id
    JOIN cohorts c ON c.id = au.cohort_id
    WHERE a.course_id = :pactId AND c.course_id = :pactId AND au.unlocked_by IS NOT NULL
  UNION
  SELECT DISTINCT ccu.unlocked_by FROM course_content_unlocks ccu
    JOIN course_content_items ci ON ci.id = ccu.content_id
    JOIN cohorts c ON c.id = ccu.cohort_id
    WHERE ci.course_id = :pactId AND c.course_id = :pactId AND ccu.unlocked_by IS NOT NULL
  UNION
  SELECT DISTINCT spu.unlocked_by FROM scenario_package_unlocks spu
    JOIN scenario_packages sp ON sp.id = spu.package_id
    JOIN cohorts c ON c.id = spu.cohort_id
    WHERE sp.course_id = :pactId AND c.course_id = :pactId AND spu.unlocked_by IS NOT NULL
  UNION
  SELECT DISTINCT cdu.unlocked_by FROM campaign_drop_unlocks cdu
    JOIN campaign_drops cd ON cd.id = cdu.drop_id
    JOIN cohorts c ON c.id = cdu.cohort_id
    WHERE cd.course_id = :pactId AND c.course_id = :pactId AND cdu.unlocked_by IS NOT NULL
  UNION
  SELECT DISTINCT first_solver_id FROM squad_puzzle_completions WHERE course_id = :pactId
  UNION
  SELECT DISTINCT dls.user_id FROM drop_location_selections dls
    JOIN campaign_drops cd ON cd.id = dls.drop_id WHERE cd.course_id = :pactId
`;

// Order matters — parents before children. `users` is inserted separately,
// first, using NEEDED_USER_IDS_SQL above.
const TABLES = [
  { table: 'modules', sql: `SELECT * FROM modules WHERE course_id = :pactId` },
  { table: 'content_items', sql: `SELECT ci.* FROM content_items ci JOIN modules m ON m.id = ci.module_id WHERE m.course_id = :pactId` },
  { table: 'assignments', sql: `SELECT * FROM assignments WHERE course_id = :pactId` },
  { table: 'cohorts', sql: `SELECT * FROM cohorts WHERE course_id = :pactId` },
  { table: 'enrollments', sql: `SELECT * FROM enrollments WHERE course_id = :pactId` },
  { table: 'squads', sql: `SELECT sq.* FROM squads sq JOIN cohorts c ON c.id = sq.cohort_id WHERE c.course_id = :pactId` },
  { table: 'scenario_packages', sql: `SELECT * FROM scenario_packages WHERE course_id = :pactId` },
  { table: 'course_content_items', sql: `SELECT * FROM course_content_items WHERE course_id = :pactId` },
  { table: 'campaign_drops', sql: `SELECT * FROM campaign_drops WHERE course_id = :pactId` },
  { table: 'campaign_drop_puzzles', sql: `SELECT cdp.* FROM campaign_drop_puzzles cdp JOIN campaign_drops cd ON cd.id = cdp.drop_id WHERE cd.course_id = :pactId` },
  { table: 'intel_boards', sql: `SELECT * FROM intel_boards WHERE course_id = :pactId` },
  { table: 'squad_puzzle_completions', sql: `SELECT * FROM squad_puzzle_completions WHERE course_id = :pactId` },
  { table: 'drop_location_selections', sql: `SELECT dls.* FROM drop_location_selections dls JOIN campaign_drops cd ON cd.id = dls.drop_id WHERE cd.course_id = :pactId` },
  { table: 'submissions', sql: `SELECT s.* FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE a.course_id = :pactId` },
  { table: 'grades', sql: `SELECT g.* FROM grades g JOIN assignments a ON a.id = g.assignment_id WHERE a.course_id = :pactId` },
  { table: 'squad_challenge_states', sql: `SELECT scs.* FROM squad_challenge_states scs JOIN assignments a ON a.id = scs.assignment_id WHERE a.course_id = :pactId` },
  {
    table: 'assignment_unlocks',
    sql: `SELECT au.* FROM assignment_unlocks au
          JOIN assignments a ON a.id = au.assignment_id
          JOIN cohorts c ON c.id = au.cohort_id
          WHERE a.course_id = :pactId AND c.course_id = :pactId`,
  },
  {
    table: 'course_content_unlocks',
    sql: `SELECT ccu.* FROM course_content_unlocks ccu
          JOIN course_content_items ci ON ci.id = ccu.content_id
          JOIN cohorts c ON c.id = ccu.cohort_id
          WHERE ci.course_id = :pactId AND c.course_id = :pactId`,
  },
  {
    table: 'scenario_package_unlocks',
    sql: `SELECT spu.* FROM scenario_package_unlocks spu
          JOIN scenario_packages sp ON sp.id = spu.package_id
          JOIN cohorts c ON c.id = spu.cohort_id
          WHERE sp.course_id = :pactId AND c.course_id = :pactId`,
  },
  {
    table: 'campaign_drop_unlocks',
    sql: `SELECT cdu.* FROM campaign_drop_unlocks cdu
          JOIN campaign_drops cd ON cd.id = cdu.drop_id
          JOIN cohorts c ON c.id = cdu.cohort_id
          WHERE cd.course_id = :pactId AND c.course_id = :pactId`,
  },
  // Global platform config, copied wholesale — see file header.
  { table: 'lti_tool_registrations', sql: `SELECT * FROM lti_tool_registrations` },
];

async function copyTable(table, rows) {
  if (rows.length === 0) return { table, source: 0, inserted: 0 };
  if (!DRY_RUN) {
    await dest.getQueryInterface().bulkInsert(table, rows);
  }
  return { table, source: rows.length, inserted: DRY_RUN ? 0 : rows.length };
}

async function main() {
  console.log(`PACT course: ${PACT_COURSE_ID} | dry-run: ${DRY_RUN}\n`);

  const results = [];

  // courses row itself, first
  const courseRows = await source.query(`SELECT * FROM courses WHERE id = :pactId`, {
    replacements: { pactId: PACT_COURSE_ID }, type: QueryTypes.SELECT,
  });
  results.push(await copyTable('courses', courseRows));

  // users — computed via the UNION query, fetched with password_hash included
  const neededIds = await source.query(NEEDED_USER_IDS_SQL, {
    replacements: { pactId: PACT_COURSE_ID }, type: QueryTypes.SELECT,
  });
  const userIds = neededIds.map((r) => r.id).filter(Boolean);
  const userRows = userIds.length > 0
    ? await source.query(`SELECT * FROM users WHERE id IN (:ids)`, {
        replacements: { ids: userIds }, type: QueryTypes.SELECT,
      })
    : [];
  results.push(await copyTable('users', userRows));

  // Remaining tables, in FK dependency order
  for (const { table, sql } of TABLES) {
    const rows = await source.query(sql, {
      replacements: { pactId: PACT_COURSE_ID }, type: QueryTypes.SELECT,
    });
    results.push(await copyTable(table, rows));
  }

  console.log('--- Copy summary ---');
  for (const r of results) {
    console.log(`${r.table.padEnd(28)} source=${String(r.source).padStart(5)}  ${DRY_RUN ? '(dry-run, not inserted)' : `inserted=${r.inserted}`}`);
  }

  if (!DRY_RUN) {
    console.log('\n--- Verifying dest counts ---');
    for (const r of results) {
      const [{ count }] = await dest.query(`SELECT count(*) FROM "${r.table}"`, { type: QueryTypes.SELECT });
      const match = Number(count) === r.source ? 'OK' : 'MISMATCH';
      console.log(`${r.table.padEnd(28)} dest=${String(count).padStart(5)}  [${match}]`);
    }
  }

  await source.close();
  await dest.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
