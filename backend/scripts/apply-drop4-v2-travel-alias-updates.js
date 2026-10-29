'use strict';
/**
 * Adds the international cooperation / travel-alias questions
 * (lib/day4TravelAliasSpec.js) to the LIVE PACKET HEIST v2 Drop 4
 * assignments in place.
 *
 * seed-pact-day4-role-assignments.js can't do this: it deletes and recreates
 * every Drop 4 row (new ids, unpublished) and refuses once any submission
 * exists — and September's cohort has graded Drop 4 work. It also predates
 * the role-team conversion, so reseeding would revert grading_mode.
 *
 * Idempotent: questions whose id starts with ID_PREFIX are replaced, never
 * duplicated. New items go before each row's trailing prompt question, and
 * max_score is recomputed. Existing grades keep their own stored max_score.
 *
 * Dry run by default; pass --apply to write.
 * Run: node backend/scripts/apply-drop4-v2-travel-alias-updates.js [--apply]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');
const { ID_PREFIX, TRAVEL_QUESTIONS_BY_ROLE, TRAVEL_SQUAD_QUIZ_QUESTION } = require('./lib/day4TravelAliasSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const SCENARIO = 'packet-heist-v2';
const DROP = 4;
const APPLY = process.argv.includes('--apply');

const pointsOf = (q) => (q.kind === 'prompt' ? Number(q.points) : Number(q.scoring?.points)) || 0;

// Titles end "— SA (Special Agent)" etc.; the squad quiz ends "— Squad Synthesis Quiz".
function travelQuestionsFor(title) {
  if (/Squad Synthesis Quiz$/.test(title)) return [TRAVEL_SQUAD_QUIZ_QUESTION];
  const code = title.match(/— (\w+) \([^)]*\)$/)?.[1];
  return TRAVEL_QUESTIONS_BY_ROLE[code] ?? null;
}

function withTravelQuestions(questions, additions) {
  const kept = questions.filter((q) => !String(q.id).startsWith(ID_PREFIX));
  const last = kept[kept.length - 1];
  return last?.kind === 'prompt'
    ? [...kept.slice(0, -1), ...additions, last]
    : [...kept, ...additions];
}

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();
    const [rows] = await seq.query(
      `SELECT id, title, questions, max_score FROM assignments
        WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number = :drop AND archived_at IS NULL
        ORDER BY title`,
      { replacements: { courseId: COURSE_ID, scenario: SCENARIO, drop: DROP } },
    );
    if (rows.length === 0) throw new Error('No live Drop 4 v2 assignments found');

    const updates = rows.map((row) => {
      const additions = travelQuestionsFor(row.title);
      if (!additions) throw new Error(`No travel questions mapped for "${row.title}"`);
      const questions = withTravelQuestions(row.questions ?? [], additions);
      const maxScore = questions.reduce((sum, q) => sum + pointsOf(q), 0);
      console.log(`${row.title}\n  ${(row.questions ?? []).length} -> ${questions.length} items, max_score ${Number(row.max_score)} -> ${maxScore}`);
      return { id: row.id, questions, maxScore };
    });

    if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); return; }

    await seq.transaction(async (transaction) => {
      for (const u of updates) {
        await seq.query(
          'UPDATE assignments SET questions = :questions, max_score = :maxScore, updated_at = NOW() WHERE id = :id',
          { replacements: { id: u.id, questions: JSON.stringify(u.questions), maxScore: u.maxScore }, transaction },
        );
      }
    });
    console.log(`\nUpdated ${updates.length} assignments.`);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
