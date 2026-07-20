'use strict';
/**
 * Post-course survey for LAIR, for admins/instructors to review after each
 * cohort finishes (via GET /courses/:id/assignments/:aid/survey-results —
 * surveyResults.service.js already aggregates any course's survey generically:
 * per-option response distributions plus keyword-grouped free-text themes.
 * No LAIR-specific backend work needed, just the question content below).
 *
 * Unlike PACT's post-course survey (built around evidence drops/squads), this
 * is written from scratch around what LAIR actually is: a 3-day, self-paced
 * lecture+lab course with slide decks, take-home guides, lab student guides,
 * and a SIFT Workstation VM environment.
 *
 * type: 'single' options use {label, value} pairs; type: 'text' is free-form.
 * Same schema SurveyFlow (lair-app/src/components via AssignmentPage.jsx)
 * and surveyResults.service.js already expect.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course
const SURVEY_ID = 'a55e5003-0000-0000-0000-000000000003';

const agree = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
  .map((value) => ({ label: value, value }));

const questions = [
  // ── Overall Experience ──────────────────────────────────────────────────
  { id: 'q1', type: 'single', section: 'Overall Experience',
    prompt: 'Overall, this course met my expectations.', options: agree },
  { id: 'q2', type: 'single', section: 'Overall Experience',
    prompt: 'The 3-day format was appropriate for the amount of material covered.', options: agree },
  { id: 'q3', type: 'single', section: 'Overall Experience',
    prompt: 'I feel confident applying what I learned to a real Linux incident response investigation.', options: agree },

  // ── Pacing & Difficulty ─────────────────────────────────────────────────
  { id: 'q4', type: 'single', section: 'Pacing & Difficulty',
    prompt: 'Overall, the pace of the course was:',
    options: ['Too slow', 'Slightly slow', 'Just right', 'Slightly fast', 'Too fast'].map((value) => ({ label: value, value })) },
  { id: 'q5', type: 'single', section: 'Pacing & Difficulty',
    prompt: 'Which day, if any, felt the most rushed?',
    options: [
      'Day 1 — Linux Foundations & Evidence Collection',
      'Day 2 — Filesystem Hierarchy, Threat Hunting & Logs',
      'Day 3 — Memory, Live Analysis & Timelines',
      'None felt rushed',
    ].map((value) => ({ label: value, value })) },
  { id: 'q6', type: 'single', section: 'Pacing & Difficulty',
    prompt: 'Which topic would benefit most from additional lab time in a future cohort?',
    options: [
      'Linux Commands',
      'OS File Structures / Filesystems / Filesystem Artifacts',
      'Device Profiling & Log Basics',
      'Application Log Analysis',
      'Linux Timelines',
      'Live Memory Analysis & Collection',
      'Imaging & Evidence Collection',
      'None / not applicable',
    ].map((value) => ({ label: value, value })) },

  // ── Content & Materials ─────────────────────────────────────────────────
  { id: 'q7', type: 'single', section: 'Content & Materials',
    prompt: 'The slide decks clearly explained each topic before the related lab began.', options: agree },
  { id: 'q8', type: 'single', section: 'Content & Materials',
    prompt: 'The take-home learning guides were a useful reference during and after labs.', options: agree },
  { id: 'q9', type: 'single', section: 'Content & Materials',
    prompt: 'The lab student guides gave clear, followable step-by-step instructions.', options: agree },
  { id: 'q10', type: 'single', section: 'Content & Materials',
    prompt: 'The SIFT Workstation VM environment worked reliably throughout the labs.', options: agree },

  // ── Instruction ─────────────────────────────────────────────────────────
  { id: 'q11', type: 'single', section: 'Instruction',
    prompt: 'The instructor explained concepts clearly and answered questions effectively.', options: agree },
  { id: 'q12', type: 'single', section: 'Instruction',
    prompt: 'I had adequate opportunity to ask questions and get help while working through labs.', options: agree },

  // ── Assessments ─────────────────────────────────────────────────────────
  { id: 'q13', type: 'single', section: 'Assessments',
    prompt: 'The pre-course and post-course assessments were a useful gauge of what I learned.', options: agree },

  // ── Open Feedback ───────────────────────────────────────────────────────
  { id: 'q14', type: 'text', section: 'Open Feedback',
    prompt: 'What is the single most valuable thing you learned in this course?' },
  { id: 'q15', type: 'text', section: 'Open Feedback',
    prompt: 'What was the most confusing or frustrating part of the course, and why?' },
  { id: 'q16', type: 'text', section: 'Open Feedback',
    prompt: 'What would you add, remove, or change about this course for future cohorts?' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      [{
        id:           SURVEY_ID,
        course_id:    COURSE_ID,
        title:        'LAIR Post-Course Survey',
        description:
          'A short survey to help instructors and program managers improve future cohorts of LAIR. ' +
          'Your individual responses are never shown to instructors alongside your name — aggregated ' +
          'results (response distributions and grouped themes from open answers) are what staff review.',
        type:         'survey',
        grading_mode: 'individual',
        order_index:  500,
        max_score:    0,
        is_published: false,
        questions:    JSON.stringify(questions),
        created_at:   now,
        updated_at:   now,
      }],
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('assignments', { id: SURVEY_ID });
  },
};

module.exports.SURVEY_ID = SURVEY_ID;
