'use strict';
/**
 * Seeds the PACKET HEIST v2 Day 5 grand jury prep challenges from
 * lib/day5GrandJuryPrepSpec.js:
 *   - four victim sets, one per victim (victim_name-scoped);
 *   - two search-testimony sets, one per Day 3 search team.
 *
 * Inserts any that don't exist yet as UNPUBLISHED drafts; rewrites existing
 * ones in place (question ids are fixed strings, so submitted check answers
 * stay attached).
 *
 * --release publishes all six and unlocks each only for the squads that own
 * it in the active cohort: a victim set for the squad whose victim_code
 * matches (releaseVictimScopedAssignments), a search set for the squads that
 * ran that search (SEARCH_SQUADS — set per cohort; the KCR op order assigns
 * scenes, the database doesn't record it).
 *
 * Dry run by default.
 * Run: node backend/scripts/seed-pact-day5-grand-jury-prep.js [--apply] [--release]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getLiveSequelize } = require('./lib/liveDb');
const spec = require('./lib/day5GrandJuryPrepSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const COHORT_ID = '9c4669aa-093c-4fad-b605-ab7356b509d8'; // PACT October 26
const UNLOCKED_BY = 'f57678cc-4964-4dec-b512-d96a015dec31'; // Cody Hitson (superadmin)
const ORDER_INDEX = 19; // with the other Day 5 prep sets, before the Day 5 Capstone (20)
// October 26 cohort, per the Day 3 KCR operation: squads 1 & 2 searched the
// residence; squads 3 & 4 searched the RestonIT office and secured CyberDyne.
const SEARCH_SQUADS = { RESIDENCE: [1, 2], OFFICE: [3, 4] };
const APPLY = process.argv.includes('--apply');
const RELEASE = process.argv.includes('--release');

const pointsOf = (q) => (q.kind === 'prompt' ? q.points : q.scoring.points);

function buildRows() {
  const victimRows = spec.VICTIM_CODES.map((code) => ({
    title: spec.titleFor(code),
    description: spec.DESCRIPTION,
    victimName: spec.VICTIMS[code].victimName,
    searchCode: null,
    questions: spec.buildQuestions(code),
    briefing: spec.launchBriefing(code),
  }));
  const searchRows = spec.SEARCH_CODES.map((code) => ({
    title: spec.searchTitleFor(code),
    description: spec.SEARCH_DESCRIPTION,
    victimName: null,
    searchCode: code,
    questions: spec.searchQuestions(code),
    briefing: spec.searchBriefing(code),
  }));
  return [...victimRows, ...searchRows].map((r) => {
    const ids = r.questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length) throw new Error(`${r.title}: duplicate question ids`);
    return { ...r, maxScore: r.questions.reduce((sum, q) => sum + pointsOf(q), 0) };
  });
}

async function release(seq, rows) {
  const assignmentService = require('../src/services/assignment.service');
  const [assignments] = await seq.query(
    'SELECT id, title FROM assignments WHERE course_id = :courseId AND title IN (:titles)',
    { replacements: { courseId: COURSE_ID, titles: rows.map((r) => r.title) } },
  );
  const idOf = new Map(assignments.map((a) => [a.title, a.id]));
  if (idOf.size !== rows.length) throw new Error('Seed with --apply before releasing');
  const [squads] = await seq.query(
    'SELECT id, number FROM squads WHERE cohort_id = :cohortId',
    { replacements: { cohortId: COHORT_ID } },
  );
  const squadIdOf = new Map(squads.map((s) => [Number(s.number), s.id]));

  const victimIds = rows.filter((r) => r.victimName).map((r) => idOf.get(r.title));
  const result = await assignmentService.releaseVictimScopedAssignments(victimIds, COHORT_ID, UNLOCKED_BY);
  console.log(`Victim sets: ${result.released_assignments} squad unlocks${result.skipped_squads.length ? `; squads without a victim: ${result.skipped_squads.join(', ')}` : ''}`);

  for (const r of rows.filter((row) => row.searchCode)) {
    const id = idOf.get(r.title);
    await seq.query('UPDATE assignments SET is_published = true, updated_at = NOW() WHERE id = :id', { replacements: { id } });
    for (const number of SEARCH_SQUADS[r.searchCode]) {
      const squadId = squadIdOf.get(number);
      if (!squadId) throw new Error(`Squad ${number} not found in cohort`);
      await assignmentService.unlockForCohort(id, COHORT_ID, UNLOCKED_BY, squadId);
    }
    console.log(`${r.title}: squads ${SEARCH_SQUADS[r.searchCode].join(' & ')}`);
  }
  assignmentService.invalidateAssignmentLists();
}

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();
    const rows = buildRows();
    const [existing] = await seq.query(
      'SELECT id, title, is_published FROM assignments WHERE course_id = :courseId AND title IN (:titles)',
      { replacements: { courseId: COURSE_ID, titles: rows.map((r) => r.title) } },
    );
    const byTitle = new Map(existing.map((e) => [e.title, e]));

    for (const r of rows) {
      const found = byTitle.get(r.title);
      const checks = r.questions.filter((q) => q.kind !== 'prompt').length;
      const audience = r.victimName ? `victim: ${r.victimName}` : `squads ${SEARCH_SQUADS[r.searchCode].join(' & ')}`;
      console.log(`${found ? `update ${found.id}${found.is_published ? ' (published)' : ''}` : 'insert'} | ${r.title}\n  ${checks} checks + ${r.questions.length - checks} deliverables, ${r.maxScore} pts | ${audience}`);
    }
    if (!APPLY) { console.log(`\nDry run only. Re-run with --apply to write${RELEASE ? ' and release' : ''}.`); return; }

    await seq.transaction(async (transaction) => {
      for (const r of rows) {
        const replacements = {
          courseId: COURSE_ID, title: r.title, description: r.description, victimName: r.victimName,
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

    if (RELEASE) await release(seq, rows);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
