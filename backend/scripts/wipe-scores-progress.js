'use strict';
/**
 * One-time: wipes all Grade + Submission rows (scores and progress) for two
 * specific test/admin accounts, across every course (PACT and LAIR both
 * have data for m.codyhitson@gmail.com) — requested directly by the account
 * owner. Does not touch the accounts themselves, enrollments, or any other
 * user's data (submissions/grades are per-user rows; a squad-shared
 * submission's other members each have their own independent row).
 *
 * Run: node backend/scripts/wipe-scores-progress.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');

const USER_IDS = [
  'f57678cc-4964-4dec-b512-d96a015dec31', // m.codyhitson@gmail.com
  '7d12b3ac-1c0a-4014-ab33-64ea9b02d2c8', // codyhitson@proton.me
];

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();

    await seq.transaction(async (transaction) => {
      const [deletedSubmissions] = await seq.query(
        `DELETE FROM submissions WHERE user_id IN (:ids) RETURNING id`,
        { replacements: { ids: USER_IDS }, transaction },
      );
      console.log(`Deleted ${deletedSubmissions.length} submissions`);

      const [deletedGrades] = await seq.query(
        `DELETE FROM grades WHERE user_id IN (:ids) RETURNING id`,
        { replacements: { ids: USER_IDS }, transaction },
      );
      console.log(`Deleted ${deletedGrades.length} grades`);

      const [deletedPuzzles] = await seq.query(
        `DELETE FROM squad_puzzle_completions WHERE first_solver_id IN (:ids) RETURNING id`,
        { replacements: { ids: USER_IDS }, transaction },
      );
      console.log(`Deleted ${deletedPuzzles.length} squad_puzzle_completions`);
    });

    console.log('Wipe complete.');
    process.exit(0);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
