'use strict';
/**
 * Read-only: prints aggregated post-course survey results for the most
 * recently-started cohort, scoped to that cohort's own enrollees (the shared
 * surveyResults.service.js aggregates across ALL cohorts for a given survey
 * assignment, so this re-implements the aggregation with a cohort filter).
 *
 * Run: node backend/scripts/latest-cohort-survey-results.js
 */
require('dotenv').config();
const { Assignment, Submission, Enrollment, Cohort } = require('../src/models');
const { Op } = require('sequelize');
const { parseResponses, aggregateSurveyResults, MIN_ANONYMOUS_RESPONSES } = require('../src/services/surveyResults.service');

async function main() {
  const cohort = await Cohort.findOne({
    where: { end_date: { [Op.lte]: new Date() }, name: { [Op.notILike]: 'TEST%' } },
    order: [['end_date', 'DESC']],
  });
  if (!cohort) { console.log('No completed cohorts found.'); return; }
  console.log(`Most recent cohort: "${cohort.name}" (${cohort.id}), course ${cohort.course_id}, started ${cohort.start_date}\n`);

  const surveyAssignments = await Assignment.findAll({
    where: { course_id: cohort.course_id, type: 'survey' },
    attributes: ['id', 'title', 'questions'],
  });
  if (surveyAssignments.length === 0) { console.log('No survey assignments found for this course.'); return; }

  const enrollments = await Enrollment.findAll({
    where: { cohort_id: cohort.id, course_id: cohort.course_id },
    attributes: ['user_id'],
  });
  const userIds = enrollments.map((e) => e.user_id);

  for (const assignment of surveyAssignments) {
    console.log(`=== Survey: "${assignment.title}" (${assignment.id}) ===`);
    const rows = await Submission.findAll({
      where: {
        assignment_id: assignment.id,
        user_id: { [Op.in]: userIds },
        status: { [Op.in]: ['submitted', 'graded', 'returned'] },
      },
      attributes: ['content'],
    });
    const responses = rows.map((row) => parseResponses(row.content)).filter(Boolean);
    if (responses.length < MIN_ANONYMOUS_RESPONSES) {
      console.log(`Suppressed — only ${responses.length} response(s), need ${MIN_ANONYMOUS_RESPONSES}.\n`);
      continue;
    }
    const result = aggregateSurveyResults(assignment.questions ?? [], responses);
    console.log(JSON.stringify(result, null, 2));
    console.log('');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
