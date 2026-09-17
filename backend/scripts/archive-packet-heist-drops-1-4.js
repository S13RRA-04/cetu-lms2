'use strict';
/**
 * Archives the old 'packet-heist' scenario's Drop 1-4 (July 26 cohort ran
 * these for real — 24-34 students, 50-66 submissions each per drop; that
 * history must be preserved, not deleted). This only frees the
 * (course_id, number) slots 1-4 so the PACKET HEIST v2 rebuild
 * (scenario_name='packet-heist-v2') can use them for the Sept 21-25, 2026
 * cohort, per the user's explicit direction: "Archive the old drops. These
 * new ones replace them."
 *
 * Renumbers old Drop N -> N+100 (1->101 ... 4->104) across every table that
 * carries a drop_number: campaign_drops.number, and the paired
 * course_content_items/assignments/scenario_packages.drop_number columns.
 * Confirmed via information_schema that these are the *only* three tables
 * with a drop_number column; every other drop-scoped table (
 * campaign_drop_puzzles, campaign_drop_unlocks, drop_location_selections,
 * squad_puzzle_completions) references drop_id (the stable UUID) and is
 * untouched by this renumber. Submissions/grades reference assignment_id,
 * never drop_number, so they are unaffected either way.
 *
 * Does NOT touch is_published or any release/unlock state - this only
 * frees the number slot, it does not hide anything from students who
 * already completed it.
 *
 * Idempotent: if Drop 1-4 for 'packet-heist' are already renumbered (or
 * absent), this is a no-op.
 *
 * Run: node backend/scripts/archive-packet-heist-drops-1-4.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const OLD_SCENARIO = 'packet-heist';
const OFFSET = 100;
const NUMBERS = [1, 2, 3, 4];

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();

    const [before] = await seq.query(
      `SELECT id, number, title FROM campaign_drops
       WHERE course_id = :courseId AND scenario_name = :scenario AND number IN (:numbers)
       ORDER BY number`,
      { replacements: { courseId: COURSE_ID, scenario: OLD_SCENARIO, numbers: NUMBERS } },
    );
    if (before.length === 0) {
      console.log('No packet-heist Drop 1-4 rows found at their original numbers - already archived or never existed. No-op.');
      return;
    }
    console.log('Archiving these campaign_drops rows:', before);

    await seq.transaction(async (transaction) => {
      const [drops] = await seq.query(
        `UPDATE campaign_drops SET number = number + :offset, updated_at = NOW()
         WHERE course_id = :courseId AND scenario_name = :scenario AND number IN (:numbers)
         RETURNING id, number, title`,
        { replacements: { courseId: COURSE_ID, scenario: OLD_SCENARIO, numbers: NUMBERS, offset: OFFSET }, transaction },
      );
      console.log(`campaign_drops: renumbered ${drops.length} rows`, drops);

      const [content] = await seq.query(
        `UPDATE course_content_items SET drop_number = drop_number + :offset, updated_at = NOW()
         WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number IN (:numbers)
         RETURNING id`,
        { replacements: { courseId: COURSE_ID, scenario: OLD_SCENARIO, numbers: NUMBERS, offset: OFFSET }, transaction },
      );
      console.log(`course_content_items: renumbered ${content.length} rows`);

      const [assignments] = await seq.query(
        `UPDATE assignments SET drop_number = drop_number + :offset, updated_at = NOW()
         WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number IN (:numbers)
         RETURNING id`,
        { replacements: { courseId: COURSE_ID, scenario: OLD_SCENARIO, numbers: NUMBERS, offset: OFFSET }, transaction },
      );
      console.log(`assignments: renumbered ${assignments.length} rows`);

      const [packages] = await seq.query(
        `UPDATE scenario_packages SET drop_number = drop_number + :offset, updated_at = NOW()
         WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number IN (:numbers)
         RETURNING id`,
        { replacements: { courseId: COURSE_ID, scenario: OLD_SCENARIO, numbers: NUMBERS, offset: OFFSET }, transaction },
      );
      console.log(`scenario_packages: renumbered ${packages.length} rows`);
    });

    console.log('Archive complete. Old Drop 1-4 now live at numbers 101-104 (scenario_name unchanged, is_published unchanged, nothing hidden from past students).');
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { main };
