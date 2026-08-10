'use strict';
/**
 * One-time copy of the PACT course graph from the old Neon database to the
 * live Supabase database. See the plan this was built from for full context:
 * Neon holds the real PACT program (99 assignments, 852 submissions, 881
 * grades, 37 enrolled users across 5 cohorts) that never made it over when
 * the app itself was pointed at Supabase. This script copies just the rows
 * that hang off the PACT course, preserving ids so every foreign key stays
 * valid, and reconciles the 3 user accounts that already exist on both
 * sides (by email) instead of duplicating them.
 *
 * Safe by default: runs as a dry run (reports what it WOULD do) unless
 * called with --apply. Every write uses bulkCreate({ ignoreDuplicates:
 * true }), so re-running after a partial failure only inserts what's
 * still missing — never duplicates, never errors on already-copied rows.
 *
 * Run:
 *   node backend/scripts/migrate-pact-neon-to-supabase.js            # dry run
 *   node backend/scripts/migrate-pact-neon-to-supabase.js --apply    # writes
 */
require('dotenv').config();
const { Sequelize, Op } = require('sequelize');

const PACT_COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const APPLY = process.argv.includes('--apply');

const NEON_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.PACT_SUPABASE_SESSION_POOL;

if (!NEON_URL || !SUPABASE_URL) {
  console.error('Both DATABASE_URL (Neon) and PACT_SUPABASE_SESSION_POOL (Supabase) must be set in backend/.env');
  process.exit(1);
}

// Mirrors backend/src/config/database.js's opts exactly, so these two
// standalone connections behave identically to the app's real connection
// (same underscored/timestamps mapping, same SSL requirement).
function buildSequelize(url) {
  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    define: { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });
}

const MODEL_NAMES = [
  'Course', 'User', 'Module', 'Cohort', 'Squad', 'Enrollment', 'Assignment', 'AssignmentUnlock',
  'CourseContentItem', 'CourseContentUnlock', 'Submission', 'Grade', 'CampaignDrop',
  'CampaignDropPuzzle', 'CampaignDropUnlock', 'ScenarioPackage', 'ScenarioPackageUnlock',
  'IntelBoard', 'SquadChallengeState', 'SquadPuzzleCompletion',
];

function loadModels(sequelize) {
  const models = {};
  for (const name of MODEL_NAMES) models[name] = require(`../src/models/${name}`)(sequelize);
  return models;
}

async function main() {
  const source = buildSequelize(NEON_URL);
  const target = buildSequelize(SUPABASE_URL);
  const Source = loadModels(source);
  const Target = loadModels(target);

  await source.authenticate();
  await target.authenticate();
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  // ── Identity reconciliation ────────────────────────────────────────────
  const sourceUsers = await Source.User.scope('withPassword').findAll({ where: {}, raw: true });
  const targetUsers = await Target.User.findAll({ attributes: ['id', 'email'], raw: true });
  const targetEmailToId = new Map(targetUsers.map((u) => [u.email.toLowerCase(), u.id]));

  const remap = new Map(); // neonUserId -> supabaseUserId (only for the overlapping accounts)
  const usersToInsert = [];
  for (const u of sourceUsers) {
    const existingId = targetEmailToId.get(u.email.toLowerCase());
    if (existingId) remap.set(u.id, existingId);
    else usersToInsert.push(u);
  }
  const remapId = (id) => (id == null ? id : (remap.get(id) ?? id));

  console.log(`Users: ${sourceUsers.length} on Neon — ${usersToInsert.length} to insert, ${remap.size} already exist on Supabase and will be reconciled by email:`);
  for (const [neonId, supabaseId] of remap) {
    const email = sourceUsers.find((u) => u.id === neonId)?.email;
    console.log(`  - ${email}: neon ${neonId} -> existing supabase ${supabaseId}`);
  }
  console.log('');

  // ── Scope every dependent table to the PACT course ─────────────────────
  const course = await Source.Course.findByPk(PACT_COURSE_ID, { raw: true });
  if (!course) throw new Error(`PACT course ${PACT_COURSE_ID} not found on Neon`);

  const modules = await Source.Module.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const cohorts = await Source.Cohort.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const cohortIds = cohorts.map((c) => c.id);
  const squads = await Source.Squad.findAll({ where: { cohort_id: cohortIds }, raw: true });
  const squadIds = squads.map((s) => s.id);
  const enrollments = await Source.Enrollment.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const assignments = await Source.Assignment.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const assignmentIds = assignments.map((a) => a.id);
  const assignmentUnlocks = await Source.AssignmentUnlock.findAll({ where: { assignment_id: assignmentIds }, raw: true });
  const contentItems = await Source.CourseContentItem.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const contentItemIds = contentItems.map((c) => c.id);
  const contentUnlocks = await Source.CourseContentUnlock.findAll({ where: { content_id: contentItemIds }, raw: true });
  const submissions = await Source.Submission.findAll({ where: { assignment_id: assignmentIds }, raw: true });
  const grades = await Source.Grade.findAll({ where: { assignment_id: assignmentIds }, raw: true });
  const drops = await Source.CampaignDrop.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const dropIds = drops.map((d) => d.id);
  const dropPuzzles = await Source.CampaignDropPuzzle.findAll({ where: { drop_id: dropIds }, raw: true });
  const dropUnlocks = await Source.CampaignDropUnlock.findAll({ where: { drop_id: dropIds }, raw: true });
  const scenarioPackages = await Source.ScenarioPackage.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const scenarioPackageIds = scenarioPackages.map((s) => s.id);
  const scenarioUnlocks = await Source.ScenarioPackageUnlock.findAll({ where: { package_id: scenarioPackageIds }, raw: true });
  const intelBoards = await Source.IntelBoard.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const challengeStates = await Source.SquadChallengeState.findAll({ where: { assignment_id: assignmentIds }, raw: true });
  const puzzleCompletions = await Source.SquadPuzzleCompletion.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });

  // ── Apply user-id remapping to every row that references a user ────────
  course.instructor_id = remapId(course.instructor_id);
  for (const c of cohorts) c.pre_range_briefing_released_by = remapId(c.pre_range_briefing_released_by);
  for (const e of enrollments) e.user_id = remapId(e.user_id);
  for (const au of assignmentUnlocks) au.unlocked_by = remapId(au.unlocked_by);
  for (const cu of contentUnlocks) cu.unlocked_by = remapId(cu.unlocked_by);
  for (const s of submissions) s.user_id = remapId(s.user_id);
  for (const g of grades) { g.user_id = remapId(g.user_id); g.graded_by = remapId(g.graded_by); }
  for (const du of dropUnlocks) du.unlocked_by = remapId(du.unlocked_by);
  for (const su of scenarioUnlocks) su.unlocked_by = remapId(su.unlocked_by);
  for (const ib of intelBoards) ib.last_saved_by = remapId(ib.last_saved_by);
  for (const cs of challengeStates) cs.updated_by = remapId(cs.updated_by);
  for (const pc of puzzleCompletions) pc.first_solver_id = remapId(pc.first_solver_id);

  const plan = [
    ['Course', [course]],
    ['User (new only)', usersToInsert],
    ['Module', modules],
    ['Cohort', cohorts],
    ['Squad', squads],
    ['Enrollment', enrollments],
    ['Assignment', assignments],
    ['AssignmentUnlock', assignmentUnlocks],
    ['CourseContentItem', contentItems],
    ['CourseContentUnlock', contentUnlocks],
    ['Submission', submissions],
    ['Grade', grades],
    ['CampaignDrop', drops],
    ['CampaignDropPuzzle', dropPuzzles],
    ['CampaignDropUnlock', dropUnlocks],
    ['ScenarioPackage', scenarioPackages],
    ['ScenarioPackageUnlock', scenarioUnlocks],
    ['IntelBoard', intelBoards],
    ['SquadChallengeState', challengeStates],
    ['SquadPuzzleCompletion', puzzleCompletions],
  ];

  console.log('Rows scoped to PACT on Neon (about to copy):');
  for (const [label, rows] of plan) console.log(`  ${label.padEnd(24)} ${rows.length}`);
  console.log('');

  if (!APPLY) {
    console.log('Dry run complete — no writes made. Re-run with --apply to perform the migration.');
    await source.close(); await target.close();
    return;
  }

  const targetModelFor = {
    Course: Target.Course, 'User (new only)': Target.User, Module: Target.Module, Cohort: Target.Cohort,
    Squad: Target.Squad, Enrollment: Target.Enrollment, Assignment: Target.Assignment,
    AssignmentUnlock: Target.AssignmentUnlock, CourseContentItem: Target.CourseContentItem,
    CourseContentUnlock: Target.CourseContentUnlock, Submission: Target.Submission, Grade: Target.Grade,
    CampaignDrop: Target.CampaignDrop, CampaignDropPuzzle: Target.CampaignDropPuzzle,
    CampaignDropUnlock: Target.CampaignDropUnlock, ScenarioPackage: Target.ScenarioPackage,
    ScenarioPackageUnlock: Target.ScenarioPackageUnlock, IntelBoard: Target.IntelBoard,
    SquadChallengeState: Target.SquadChallengeState, SquadPuzzleCompletion: Target.SquadPuzzleCompletion,
  };

  for (const [label, rows] of plan) {
    if (rows.length === 0) continue;
    const model = targetModelFor[label];
    await model.bulkCreate(rows, { ignoreDuplicates: true });
    console.log(`Inserted (or skipped existing): ${label} — ${rows.length} rows`);
  }

  console.log('\nVerifying — target row counts for PACT-related rows:');
  for (const [label, rows] of plan) {
    if (rows.length === 0) continue;
    const model = targetModelFor[label];
    const ids = rows.map((r) => r.id).filter(Boolean);
    const count = ids.length
      ? await model.count({ where: { id: { [Op.in]: ids } } })
      : null;
    const status = count === rows.length ? 'OK' : `MISMATCH (expected ${rows.length})`;
    console.log(`  ${label.padEnd(24)} ${count ?? 'n/a'} ${status === 'OK' ? '' : '  ' + status}`);
  }

  await source.close();
  await target.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
