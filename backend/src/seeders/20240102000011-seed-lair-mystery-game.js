'use strict';
/**
 * Day 1 "The Locked Lab" — a second TerminalGame-engine game
 * (assignments.type = 'game', same lair-app/src/components/TerminalGame.jsx
 * as Terminal Drill, now generalized to accept a level-pack via props —
 * see AssignmentPage.jsx's GAME_PACKS map, keyed by this row's id).
 * An original internal-personnel whodunit (not an external intrusion, to
 * read as its own story rather than a reskin of Terminal Drill) — content
 * lives in lair-app/src/data/mysteryGameLevels.js, same static-frontend-
 * content rationale as every other game/resource in this course.
 * order_index 108 lands it right after Speed Drills (107), still inside
 * the Day 1 band (floor(order_index/100) === 1) — no `module_id` column
 * exists on `assignments`, see prior seeders' notes.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const GAME_ID   = 'e1a10007-0000-0000-0000-000000000015';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           GAME_ID,
        course_id:    COURSE_ID,
        title:        'Day 1 – The Locked Lab: A Command-Line Mystery',
        description:
          'The Meridian Bank case file vanished from sift-lab01 overnight, and four people had after-hours ' +
          'badge access. Work through 8 levels of an in-browser simulated terminal — real Linux commands ' +
          '(ls, cd, cat, head/tail, grep, find, permissions) — to find out who deleted it and prove it. ' +
          'No VM, no setup — just the shell in your browser.',
        type:         'game',
        grading_mode: 'individual',
        order_index:  108,
        max_score:    100,
        is_published: false,
        questions:    JSON.stringify([]),
        created_at:   now,
        updated_at:   now,
      }],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('assignments', { id: GAME_ID });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.GAME_ID = GAME_ID;
