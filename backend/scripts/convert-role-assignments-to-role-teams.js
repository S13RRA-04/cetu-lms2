'use strict';
/**
 * Turn role-targeted, individually graded PACT assignments into role-team
 * work (grading_mode 'squad' + their existing role_filters — see
 * src/utils/roleTeam.js): each squad's members in that role share one
 * submission and one grade.
 *
 * Skips any assignment the ACTIVE cohort already has submissions on — those
 * stay individual, so work in flight is never stranded (per the decision of
 * 2026-10-27). Past cohorts' submissions don't block a switch; their grades
 * are untouched, but their per-person submissions will show grouped by squad
 * in the Grade Center.
 *
 * Deploy the role-team code BEFORE running with --apply: older code fans a
 * squad grade out to the whole squad, not just the role team.
 *
 * Run:  node backend/scripts/convert-role-assignments-to-role-teams.js           (dry run)
 *       node backend/scripts/convert-role-assignments-to-role-teams.js --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb.js');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const APPLY = process.argv.includes('--apply');

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.transaction(async (transaction) => {
      const [[cohort]] = await seq.query(
        'SELECT id, name FROM cohorts WHERE course_id = :courseId AND is_active = true',
        { replacements: { courseId: COURSE_ID }, transaction },
      );
      if (!cohort) throw new Error('No active cohort — refusing to guess which work is in flight.');

      const [rows] = await seq.query(
        `SELECT a.id, a.title, a.role_filters, a.is_published,
                EXISTS (
                  SELECT 1 FROM submissions s
                  JOIN enrollments e ON e.user_id = s.user_id AND e.course_id = a.course_id AND e.cohort_id = :cohortId
                  WHERE s.assignment_id = a.id
                ) AS in_flight
         FROM assignments a
         WHERE a.course_id = :courseId
           AND a.grading_mode = 'individual'
           AND cardinality(a.role_filters) > 0
           AND a.archived_at IS NULL
         ORDER BY a.order_index, a.title`,
        { replacements: { courseId: COURSE_ID, cohortId: cohort.id }, transaction },
      );

      const convert = rows.filter((r) => !r.in_flight);
      const keep = rows.filter((r) => r.in_flight);
      console.log(`Active cohort: ${cohort.name}`);
      console.log(`Role-targeted individual assignments: ${rows.length}`);
      console.log(`  → role team: ${convert.length}`);
      console.log(`  stay individual (active cohort has work in): ${keep.length}`);
      for (const r of keep) console.log(`     keep: ${r.title}`);

      if (!APPLY) {
        console.log('\nDry run — nothing changed. Re-run with --apply.');
        return;
      }
      if (convert.length === 0) return;
      const [, meta] = await seq.query(
        `UPDATE assignments SET grading_mode = 'squad', updated_at = NOW()
         WHERE id IN (:ids) AND grading_mode = 'individual'`,
        { replacements: { ids: convert.map((r) => r.id) }, transaction },
      );
      console.log(`\nConverted ${meta?.rowCount ?? convert.length} assignment(s) to role-team work.`);
    });
  } finally {
    await seq.close();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
