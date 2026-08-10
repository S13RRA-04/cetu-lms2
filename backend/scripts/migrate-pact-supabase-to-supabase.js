'use strict';
/**
 * Phase 3 of the LAIR/PACT/KCR database-separation plan: copies PACT's
 * course graph out of the current shared Supabase project into PACT's own
 * dedicated Supabase project, so PACT stops sharing a database with LAIR.
 *
 * Directly adapted from migrate-pact-neon-to-supabase.js (same
 * dependency-ordered table list, same bulkCreate({ ignoreDuplicates: true })
 * idempotency, same dry-run-by-default safety rail) — but simpler in one
 * respect: the target database starts completely empty, so there is no
 * identity reconciliation to do. All PACT-enrolled users (which, checked
 * live, is every user in the current shared project — the 3 accounts that
 * also have LAIR access included) are copied with their existing id,
 * email, and password_hash intact. After this runs, those 3 accounts exist
 * as two independent rows — one here (PACT), one still in the original
 * project (LAIR) — same credentials on each side, but no longer the same
 * row. That's an accepted consequence of true physical separation, not a
 * bug.
 *
 * Also copies the investigation-simulation-engine tables (didn't exist
 * during the Neon migration), scoped the same way as everything else: via
 * the PACT assignment ids.
 *
 * Run:
 *   node backend/scripts/migrate-pact-supabase-to-supabase.js            # dry run
 *   node backend/scripts/migrate-pact-supabase-to-supabase.js --apply    # writes
 */
require('dotenv').config();
const { Sequelize, Op } = require('sequelize');

const PACT_COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const APPLY = process.argv.includes('--apply');

const SOURCE_URL = process.env.PACT_SUPABASE_SESSION_POOL; // current shared project (LAIR + PACT today)
const TARGET_URL = process.env.PACT_ONLY_SUPABASE_SESSION_POOL; // PACT's new dedicated project

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Both PACT_SUPABASE_SESSION_POOL (current shared project) and PACT_ONLY_SUPABASE_SESSION_POOL (PACT\'s new project) must be set in backend/.env');
  process.exit(1);
}

// Mirrors backend/src/config/database.js's opts exactly.
function buildSequelize(url) {
  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    define: { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });
}

const CORE_MODEL_NAMES = [
  'Course', 'User', 'Module', 'Cohort', 'Squad', 'Enrollment', 'Assignment', 'AssignmentUnlock',
  'CourseContentItem', 'CourseContentUnlock', 'Submission', 'Grade', 'CampaignDrop',
  'CampaignDropPuzzle', 'CampaignDropUnlock', 'ScenarioPackage', 'ScenarioPackageUnlock',
  'IntelBoard', 'SquadChallengeState', 'SquadPuzzleCompletion',
];

// Investigation-simulation-engine tables — new since the Neon migration.
const CASE_MODEL_NAMES = [
  'InvestigationCase', 'CaseEntity', 'CaseEntityRelationship', 'CasePersona', 'CaseEvidence',
  'SquadCaseState', 'CaseAction', 'CaseHypothesis', 'CaseLegalProcess', 'CaseInterview',
  'CaseAttributionAssessment',
];

function loadModels(sequelize) {
  const models = {};
  for (const name of [...CORE_MODEL_NAMES, ...CASE_MODEL_NAMES]) models[name] = require(`../src/models/${name}`)(sequelize);
  return models;
}

async function main() {
  const source = buildSequelize(SOURCE_URL);
  const target = buildSequelize(TARGET_URL);
  const Source = loadModels(source);
  const Target = loadModels(target);

  await source.authenticate();
  await target.authenticate();
  console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  // ── Scope every dependent table to the PACT course ─────────────────────
  const course = await Source.Course.findByPk(PACT_COURSE_ID, { raw: true });
  if (!course) throw new Error(`PACT course ${PACT_COURSE_ID} not found in the source project`);

  const modules = await Source.Module.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const cohorts = await Source.Cohort.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const cohortIds = cohorts.map((c) => c.id);
  const squads = await Source.Squad.findAll({ where: { cohort_id: cohortIds }, raw: true });
  const squadIds = squads.map((s) => s.id);
  const enrollments = await Source.Enrollment.findAll({ where: { course_id: PACT_COURSE_ID }, raw: true });
  const userIds = [...new Set(enrollments.map((e) => e.user_id))];
  const users = await Source.User.scope('withPassword').findAll({ where: { id: userIds }, raw: true });
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

  // ── Investigation-simulation-engine tables ──────────────────────────────
  const investigationCases = await Source.InvestigationCase.findAll({ where: { assignment_id: assignmentIds }, raw: true });
  const caseIds = investigationCases.map((c) => c.id);
  const caseEntities = await Source.CaseEntity.findAll({ where: { case_id: caseIds }, raw: true });
  const caseEntityRelationships = await Source.CaseEntityRelationship.findAll({ where: { case_id: caseIds }, raw: true });
  const casePersonas = await Source.CasePersona.findAll({ where: { case_id: caseIds }, raw: true });
  const caseEvidence = await Source.CaseEvidence.findAll({ where: { case_id: caseIds }, raw: true });
  const squadCaseStates = await Source.SquadCaseState.findAll({ where: { case_id: caseIds }, raw: true });
  const caseActions = await Source.CaseAction.findAll({ where: { case_id: caseIds }, raw: true });
  const caseHypotheses = await Source.CaseHypothesis.findAll({ where: { case_id: caseIds }, raw: true });
  const caseLegalProcesses = await Source.CaseLegalProcess.findAll({ where: { case_id: caseIds }, raw: true });
  const caseInterviews = await Source.CaseInterview.findAll({ where: { case_id: caseIds }, raw: true });
  const caseAttributionAssessments = await Source.CaseAttributionAssessment.findAll({ where: { case_id: caseIds }, raw: true });

  const plan = [
    ['Course', [course]],
    ['User', users],
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
    ['InvestigationCase', investigationCases],
    ['CaseEntity', caseEntities],
    ['CaseEntityRelationship', caseEntityRelationships],
    ['CasePersona', casePersonas],
    ['CaseEvidence', caseEvidence],
    ['SquadCaseState', squadCaseStates],
    ['CaseAction', caseActions],
    ['CaseHypothesis', caseHypotheses],
    ['CaseLegalProcess', caseLegalProcesses],
    ['CaseInterview', caseInterviews],
    ['CaseAttributionAssessment', caseAttributionAssessments],
  ];

  console.log('Rows scoped to PACT in the source project (about to copy):');
  for (const [label, rows] of plan) console.log(`  ${label.padEnd(28)} ${rows.length}`);
  console.log('');

  if (!APPLY) {
    console.log('Dry run complete — no writes made. Re-run with --apply to perform the migration.');
    await source.close(); await target.close();
    return;
  }

  const targetModelFor = Object.fromEntries(plan.map(([label]) => [label, Target[label]]));

  for (const [label, rows] of plan) {
    if (rows.length === 0) continue;
    await targetModelFor[label].bulkCreate(rows, { ignoreDuplicates: true });
    console.log(`Inserted (or skipped existing): ${label} — ${rows.length} rows`);
  }

  console.log('\nVerifying — target row counts for PACT-related rows:');
  for (const [label, rows] of plan) {
    if (rows.length === 0) continue;
    const ids = rows.map((r) => r.id).filter(Boolean);
    const count = ids.length
      ? await targetModelFor[label].count({ where: { id: { [Op.in]: ids } } })
      : null;
    const status = count === rows.length ? 'OK' : `MISMATCH (expected ${rows.length})`;
    console.log(`  ${label.padEnd(28)} ${count ?? 'n/a'} ${status === 'OK' ? '' : '  ' + status}`);
  }

  await source.close();
  await target.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
