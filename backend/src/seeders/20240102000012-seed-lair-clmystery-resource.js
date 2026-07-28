'use strict';
/**
 * Another linked external resource, same pattern as 20240102000008/9/10:
 * Noah Veltman's "Command Line Murders" (clmystery) — a real local terminal
 * murder-mystery game (files hide clues, solved with cat/grep/find). No
 * infra/content of ours involved, just a course_content_items row pointing
 * out to the real repo so students can clone and play the authentic game.
 * Placed in the Beginner tier (order_index 13, same band/prefix convention
 * as 20240102000010) right after Bashcrawl.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const ITEM_ID   = 'f1a1000e-0000-0000-0000-00000000000e';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'course_content_items',
      [{
        id:                   ITEM_ID,
        course_id:            COURSE_ID,
        title:                '[Beginner] Command Line Murders',
        description:
          'Optional extra practice outside class: a free, local terminal murder-mystery game. Clone the repo ' +
          'and investigate a case entirely through cat, grep, and find — clues are hidden in real files, not a UI. ' +
          'A fun, low-stakes way to drill the same commands used in Terminal Drill and The Locked Lab.',
        content_type:         'resource',
        url:                  'https://github.com/veltman/clmystery',
        linked_assignment_id: null,
        order_index:          13,
        is_published:         false,
        created_at:           now,
        updated_at:           now,
      }],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('course_content_items', { id: ITEM_ID });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.ITEM_ID = ITEM_ID;
