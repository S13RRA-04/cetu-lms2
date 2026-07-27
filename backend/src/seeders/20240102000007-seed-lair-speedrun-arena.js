'use strict';
/**
 * Day 1 "Speed Drills" — a rapid-fire, single-task command-line speedrun
 * (assignments.type = 'challenge', lair-app/src/components/SpeedrunArena.jsx).
 * Unlike Terminal Drill (type='game', read-only investigation), each task
 * here gets a fresh mutable scratch workspace and drills one mutating
 * command (rm, mv, cp, mkdir -p, touch, chmod, echo redirects). Task/level
 * content lives in lair-app/src/data/speedrunTasks.js, same rationale as
 * Terminal Drill: no assignment type in this app has a generic admin content
 * editor, so curated content is checked into the frontend.
 * order_index 107 lands it after Terminal Drill (105) and before OS File
 * Structures (110). Do NOT add a `module_id` column to this insert — it
 * does not exist on `assignments`; day-grouping is derived purely from
 * floor(order_index/100) in CoursePage.jsx.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const SPEEDRUN_ID = 'e1a10006-0000-0000-0000-000000000014';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           SPEEDRUN_ID,
        course_id:    COURSE_ID,
        title:        'Day 1 – Speed Drills: Command Line Sprint',
        description:
          'Twelve rapid-fire tasks, each dropping you into a fresh scratch workspace with one job: ' +
          'delete a file, rename it, lock down its permissions, redirect output into it. Real commands ' +
          '(rm, mv, cp, mkdir -p, touch, chmod, echo with > and >>), no narrative — just speed and accuracy.',
        type:         'challenge',
        grading_mode: 'individual',
        order_index:  107,
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
    await queryInterface.bulkDelete('assignments', { id: SPEEDRUN_ID });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.SPEEDRUN_ID = SPEEDRUN_ID;
