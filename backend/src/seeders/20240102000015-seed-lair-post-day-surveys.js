'use strict';
/**
 * Three short post-day surveys for LAIR (Day 1/2/3), complementing the
 * existing end-of-course survey (20240102000005, order_index 500). Same
 * schema/rendering path (SurveyFlow via AssignmentPage.jsx, aggregated via
 * the generic surveyResults.service.js) — just placed at the end of each
 * day's section list instead of as a course-level bookend.
 *
 * Placement: order_index 190/290/390 — inside each day's band
 * (floor(order_index/100) === 1/2/3 per CoursePage.jsx's dayOf()) but
 * higher than every other item in that day, so each survey sorts last
 * within its own day's accordion rather than needing a new bookend slot.
 */
const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234'; // LAIR course

const agree = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
  .map((value) => ({ label: value, value }));

const pace = ['Too slow', 'Slightly slow', 'Just right', 'Slightly fast', 'Too fast']
  .map((value) => ({ label: value, value }));

const DAY1_ID = 'a55e5010-0000-0000-0000-000000000010';
const DAY2_ID = 'a55e5011-0000-0000-0000-000000000011';
const DAY3_ID = 'a55e5012-0000-0000-0000-000000000012';

const day1Questions = [
  { id: 'q1', type: 'single', section: 'Today',
    prompt: 'Today\'s lecture material (Linux Commands, OS File Structures, Filesystems, Filesystem Artifacts) was clearly explained.', options: agree },
  { id: 'q2', type: 'single', section: 'Today',
    prompt: 'The hands-on labs today reinforced what was covered in lecture.', options: agree },
  { id: 'q3', type: 'single', section: 'Today',
    prompt: 'Terminal Drill, Speed Drills, and/or The Locked Lab were a useful way to practice today\'s commands.', options: agree },
  { id: 'q4', type: 'single', section: 'Today',
    prompt: 'Today\'s pace was:', options: pace },
  { id: 'q5', type: 'single', section: 'Today',
    prompt: 'Which part of today felt least clear?',
    options: ['Linux Commands', 'OS File Structures', 'Filesystems', 'Filesystem Artifacts', 'The command-line games', 'None, everything was clear']
      .map((value) => ({ label: value, value })) },
  { id: 'q6', type: 'text', section: 'Open Feedback',
    prompt: 'What\'s one thing from today you\'d like more practice with?' },
  { id: 'q7', type: 'text', section: 'Open Feedback',
    prompt: 'Any other feedback on Day 1?' },
];

const day2Questions = [
  { id: 'q1', type: 'single', section: 'Today',
    prompt: 'Today\'s material on device profiling, logs, and application log analysis was clearly explained.', options: agree },
  { id: 'q2', type: 'single', section: 'Today',
    prompt: 'The labs today gave realistic practice hunting through logs.', options: agree },
  { id: 'q3', type: 'single', section: 'Today',
    prompt: 'The Vendor Kickback exercise (if you tried it) was a good test of today\'s skills.', options: agree },
  { id: 'q4', type: 'single', section: 'Today',
    prompt: 'Today\'s pace was:', options: pace },
  { id: 'q5', type: 'single', section: 'Today',
    prompt: 'Which part of today felt least clear?',
    options: ['Device Profiling & Log Basics', 'Application Logs, Part 1', 'Application Logs, Part 2', 'The Vendor Kickback exercise', 'None, everything was clear']
      .map((value) => ({ label: value, value })) },
  { id: 'q6', type: 'text', section: 'Open Feedback',
    prompt: 'What\'s one thing from today you\'d like more practice with?' },
  { id: 'q7', type: 'text', section: 'Open Feedback',
    prompt: 'Any other feedback on Day 2?' },
];

const day3Questions = [
  { id: 'q1', type: 'single', section: 'Today',
    prompt: 'Today\'s material on timelines, live memory analysis, and imaging was clearly explained.', options: agree },
  { id: 'q2', type: 'single', section: 'Today',
    prompt: 'The labs today gave realistic hands-on practice with live/memory analysis.', options: agree },
  { id: 'q3', type: 'single', section: 'Today',
    prompt: 'I feel ready to attempt the post-course assessment after today.', options: agree },
  { id: 'q4', type: 'single', section: 'Today',
    prompt: 'Today\'s pace was:', options: pace },
  { id: 'q5', type: 'single', section: 'Today',
    prompt: 'Which part of today felt least clear?',
    options: ['Linux Timelines', 'Live Memory Analysis', 'Live Memory Collection', 'Imaging Collection', 'None, everything was clear']
      .map((value) => ({ label: value, value })) },
  { id: 'q6', type: 'text', section: 'Open Feedback',
    prompt: 'What\'s one thing from today you\'d like more practice with?' },
  { id: 'q7', type: 'text', section: 'Open Feedback',
    prompt: 'Any other feedback on Day 3?' },
];

const ROWS = [
  { id: DAY1_ID, title: 'Day 1 – Quick Feedback', order_index: 190, questions: day1Questions },
  { id: DAY2_ID, title: 'Day 2 – Quick Feedback', order_index: 290, questions: day2Questions },
  { id: DAY3_ID, title: 'Day 3 – Quick Feedback', order_index: 390, questions: day3Questions },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'assignments',
      ROWS.map((r) => ({
        id:           r.id,
        course_id:    COURSE_ID,
        title:        r.title,
        description:  'A quick (under 2 minute) check-in on today\'s material, pacing, and labs — helps instructors adjust before the next day starts.',
        type:         'survey',
        grading_mode: 'individual',
        order_index:  r.order_index,
        max_score:    0,
        is_published: false,
        questions:    JSON.stringify(r.questions),
        created_at:   now,
        updated_at:   now,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('assignments', { id: ROWS.map((r) => r.id) });
  },
};

module.exports.COURSE_ID = COURSE_ID;
module.exports.DAY1_ID = DAY1_ID;
module.exports.DAY2_ID = DAY2_ID;
module.exports.DAY3_ID = DAY3_ID;
