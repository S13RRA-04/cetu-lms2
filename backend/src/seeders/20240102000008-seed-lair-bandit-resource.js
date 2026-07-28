'use strict';
/**
 * A linked external resource (not hosted content) pointing students at
 * OverTheWire's real Bandit wargame — extra self-paced command-line
 * practice via real SSH to OverTheWire's own servers. No infra of ours
 * involved; this is just a `course_content_items` row with content_type
 * 'resource' and an external `url`, `linked_assignment_id: null` so it
 * renders in the top-of-course "Resources" group (`ContentByType.jsx`)
 * alongside the Agenda item, not nested inside a specific day/section.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const ITEM_ID   = 'f1a10001-0000-0000-0000-000000000001';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'course_content_items',
      [{
        id:                   ITEM_ID,
        course_id:            COURSE_ID,
        title:                'OverTheWire: Bandit Wargame',
        description:
          'Optional extra practice outside class: a free, real command-line wargame hosted by OverTheWire. ' +
          'You SSH into their server and work through 30+ levels, each one hiding the password for the next. ' +
          'A good complement to Terminal Drill and Speed Drills if you want more reps before Day 2.',
        content_type:         'resource',
        url:                  'https://overthewire.org/wargames/bandit/',
        linked_assignment_id: null,
        order_index:          10,
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
