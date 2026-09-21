'use strict';
/**
 * Launch-day cohort switch for the PACT September 21-25, 2026 cohort
 * (packet-heist-v2): activates it and archives the concluded past cohorts
 * (PACT July 26 - real 35-student cohort; TEST - 0 students, dates elapsed).
 *
 * cohorts.is_active has no functional gating anywhere in the codebase
 * (confirmed by grep across backend/src and pact-app/src) - it is purely
 * informational/display metadata, so this is safe with respect to any
 * currently-enrolled student's access to their own historical grades.
 *
 * Does NOT touch scenario_name (September cohort's is already
 * 'packet-heist-v2') or target_revealed (that's the later attribution-day
 * switch, not a launch-day concern) or October/December (future, already
 * inactive, not "past").
 *
 * Idempotent: safe to re-run.
 *
 * Run: node backend/scripts/activate-september-cohort.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const SEPTEMBER_COHORT_ID = '8139412f-9db2-4ba4-8bb4-6cfd515294c3';
const ARCHIVE_COHORT_IDS = [
  '62604531-460f-4b85-86f6-dc74ec286421', // PACT July 26
  '99efb421-ed2e-4108-89b2-c5bdcfceadaf', // TEST
];

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();

    const [activated] = await seq.query(
      `UPDATE cohorts SET is_active = true, updated_at = NOW()
       WHERE id = :id AND course_id = :courseId
       RETURNING id, name, scenario_name, is_active`,
      { replacements: { id: SEPTEMBER_COHORT_ID, courseId: COURSE_ID } },
    );
    console.log('Activated:', JSON.stringify(activated, null, 2));

    const [archived] = await seq.query(
      `UPDATE cohorts SET is_active = false, updated_at = NOW()
       WHERE id IN (:ids) AND course_id = :courseId
       RETURNING id, name, is_active`,
      { replacements: { ids: ARCHIVE_COHORT_IDS, courseId: COURSE_ID } },
    );
    console.log('Archived:', JSON.stringify(archived, null, 2));

    process.exit(0);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
