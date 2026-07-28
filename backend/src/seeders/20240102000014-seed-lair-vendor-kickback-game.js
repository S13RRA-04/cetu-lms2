'use strict';
/**
 * Day 2 "The Vendor Kickback" — a second InvestigationGame case, this one
 * with commandSet="advanced" (pipes, sort/uniq/wc/cut/diff/stat — see
 * readOnlyShell.js). Original content, own cast/setting, distinct from The
 * Locked Lab (id e1a10007-...). Content lives in
 * lair-app/src/data/advancedInvestigationCase.js — same static-frontend-
 * content rationale as every other game in this course (no assignment type
 * has a generic admin content editor).
 * order_index 225 lands it right after Day 2's App Logs Part 2 (220), still
 * inside the Day 2 band (floor(order_index/100) === 2) — no `module_id`
 * column exists on `assignments`, see prior seeders' notes.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const GAME_ID   = 'e1a10008-0000-0000-0000-000000000016';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           GAME_ID,
        course_id:    COURSE_ID,
        title:        'Day 2 – The Vendor Kickback: Advanced Investigation',
        description:
          'An anonymous tip claims someone in Finance has been approving inflated invoices from a shell ' +
          'vendor and pocketing the difference — nothing has tripped an automated flag. Explore freely ' +
          'and build your case with real Linux commands, including piping them together: grep, cut, ' +
          'sort, uniq, wc, diff, and stat. A single grep won\'t reveal the pattern here — you\'ll need to ' +
          'chain commands to find it. When you\'re confident, accuse <name>. No VM, no setup — just the ' +
          'shell in your browser.',
        type:         'game',
        grading_mode: 'individual',
        order_index:  225,
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
