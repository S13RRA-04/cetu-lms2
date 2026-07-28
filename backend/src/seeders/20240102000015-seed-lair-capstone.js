'use strict';
/**
 * LAIR capstone — "Operation Quiet Ledger", vertical-slice v1: one
 * InvestigationGame terminal (pre-warrant evidence only), one legal-process
 * request (search warrant, probable-cause threshold) gatekept by an AUSA
 * persona (LLM roleplay + deterministic required-elements check, see
 * legalRequest.service.js), rendered by lair-app's CapstoneCase.jsx.
 * order_index 350 lands after Day 3's Imaging Collection (330) and before
 * the post-assessment bookend (400) — no `module_id` column, per prior
 * seeders' notes.
 */
const COURSE_ID    = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const CAPSTONE_ID  = 'e1a10009-0000-0000-0000-000000000017';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           CAPSTONE_ID,
        course_id:    COURSE_ID,
        title:        'Capstone – Operation Quiet Ledger',
        description:
          'A workstation at a Meridian Bank contractor has been making unexplained outbound connections. ' +
          'The owner has already consented to a review of that machine\'s own logs — investigate them in ' +
          'the terminal below, build probable cause, and request a search warrant from the AUSA for the ' +
          'employee\'s residence once you can articulate it. Nothing further unlocks until the AUSA is ' +
          'satisfied the legal threshold has actually been met.',
        type:         'capstone',
        grading_mode: 'individual',
        order_index:  350,
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
    await queryInterface.bulkDelete('assignments', { id: CAPSTONE_ID });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.CAPSTONE_ID = CAPSTONE_ID;
