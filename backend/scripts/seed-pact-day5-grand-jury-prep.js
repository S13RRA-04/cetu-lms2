'use strict';
/**
 * Seeds the four PACKET HEIST v2 Day 5 grand jury prep challenges — one per
 * victim — from lib/day5GrandJuryPrepSpec.js.
 *
 * Inserts any that don't exist yet as UNPUBLISHED drafts; rewrites existing
 * ones in place (question ids are fixed strings, so submitted check answers
 * stay attached). Never publishes or releases anything. Release with
 * assignmentService.releaseVictimScopedAssignments(ids, cohortId, unlockerId),
 * which unlocks each one only for the squad whose victim_code matches.
 *
 * Dry run by default.
 * Run: node backend/scripts/seed-pact-day5-grand-jury-prep.js [--apply]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');
const { VICTIM_CODES, VICTIMS, DESCRIPTION, titleFor, launchBriefing, buildQuestions } = require('./lib/day5GrandJuryPrepSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const ORDER_INDEX = 19; // with the other Day 5 prep sets, before the Day 5 Capstone (20)
const APPLY = process.argv.includes('--apply');

const pointsOf = (q) => (q.kind === 'prompt' ? q.points : q.scoring.points);

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();
    const rows = VICTIM_CODES.map((code) => {
      const questions = buildQuestions(code);
      const ids = questions.map((q) => q.id);
      if (new Set(ids).size !== ids.length) throw new Error(`${code}: duplicate question ids`);
      return {
        code,
        title: titleFor(code),
        victimName: VICTIMS[code].victimName,
        questions,
        maxScore: questions.reduce((sum, q) => sum + pointsOf(q), 0),
        briefing: launchBriefing(code),
      };
    });

    const [existing] = await seq.query(
      'SELECT id, title, is_published FROM assignments WHERE course_id = :courseId AND title IN (:titles)',
      { replacements: { courseId: COURSE_ID, titles: rows.map((r) => r.title) } },
    );
    const byTitle = new Map(existing.map((e) => [e.title, e]));

    for (const r of rows) {
      const found = byTitle.get(r.title);
      const checks = r.questions.filter((q) => q.kind !== 'prompt').length;
      console.log(`${found ? `update ${found.id}${found.is_published ? ' (published)' : ''}` : 'insert'} | ${r.title}\n  ${checks} checks + ${r.questions.length - checks} deliverables, ${r.maxScore} pts`);
    }
    if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); return; }

    await seq.transaction(async (transaction) => {
      for (const r of rows) {
        const replacements = {
          courseId: COURSE_ID, title: r.title, description: DESCRIPTION, victimName: r.victimName,
          questions: JSON.stringify(r.questions), maxScore: r.maxScore, briefing: r.briefing, orderIndex: ORDER_INDEX,
        };
        if (byTitle.has(r.title)) {
          await seq.query(
            `UPDATE assignments
                SET description = :description, launch_briefing = :briefing, questions = :questions,
                    max_score = :maxScore, victim_name = :victimName, updated_at = NOW()
              WHERE id = :id`,
            { replacements: { ...replacements, id: byTitle.get(r.title).id }, transaction },
          );
        } else {
          await seq.query(
            `INSERT INTO assignments
               (course_id, title, description, type, grading_mode, order_index, max_score, questions,
                launch_briefing, victim_name, is_published, role_filters)
             VALUES (:courseId, :title, :description, 'challenge', 'squad', :orderIndex, :maxScore, :questions,
                :briefing, :victimName, false, '{}')`,
            { replacements, transaction },
          );
        }
      }
    });
    console.log(`\nWrote ${rows.length} grand jury prep challenges (new ones unpublished).`);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
