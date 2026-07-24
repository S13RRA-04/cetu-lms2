'use strict';
/**
 * Day 1 "Terminal Drill" — an in-browser simulated command-line game
 * (assignments.type = 'game', lair-app/src/components/TerminalGame.jsx).
 * Level content (the fake filesystem, evidence markers, hints) lives in
 * lair-app/src/data/terminalGameLevels.js rather than `questions` — no
 * assignment type in this app has a generic admin-authored content editor,
 * so curated content is checked into the frontend like everything else.
 * order_index 105 lands it right after the Day 1 Linux Commands lecture
 * (100) and before OS File Structures (110).
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const DAY1_ID   = 'c1000001-0000-0000-0000-000000000001';
const GAME_ID   = 'e1a10005-0000-0000-0000-000000000013';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           GAME_ID,
        course_id:    COURSE_ID,
        module_id:    DAY1_ID,
        title:        'Day 1 – Terminal Drill: corvid-web01',
        description:
          'You have shell access to corvid-web01, a webserver flagged for suspicious outbound traffic. ' +
          'Work through 8 levels of an in-browser simulated terminal, using nothing but real Linux ' +
          'commands (ls, cd, cat, head/tail, grep, find, and reading file permissions) to recover ' +
          'evidence of compromise. No VM, no setup — just the shell in your browser.',
        type:         'game',
        grading_mode: 'individual',
        order_index:  105,
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
