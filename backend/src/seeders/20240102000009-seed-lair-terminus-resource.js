'use strict';
/**
 * Another linked external resource, same pattern as
 * 20240102000008-seed-lair-bandit-resource.js: MIT Game Lab's Terminus,
 * a browser-based text-adventure RPG where terminal commands double as
 * game actions (ls = "look around", cd <place> = "walk somewhere"). No
 * infra of ours involved — just a course_content_items row pointing out.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const ITEM_ID   = 'f1a10002-0000-0000-0000-000000000002';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'course_content_items',
      [{
        id:                   ITEM_ID,
        course_id:            COURSE_ID,
        title:                'Terminus: Learn the Command Line',
        description:
          'Optional extra practice outside class: a free, browser-based text-adventure from MIT Game Lab. ' +
          'You explore a fantasy world purely through real terminal commands — ls to look around a room, ' +
          'cd into a location, and so on. A lighter, more visual on-ramp than Bandit if commands still feel unfamiliar.',
        content_type:         'resource',
        url:                  'https://web.mit.edu/mprat/Projects/terminus/Web/main.html',
        linked_assignment_id: null,
        order_index:          11,
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
