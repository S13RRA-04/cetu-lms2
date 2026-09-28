'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { sequelize } = require('../src/config/database');
const analyticsService = require('../src/services/analytics.service');
const { Cohort, Squad } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

async function main() {
  const cohort = await Cohort.findOne({ where: { course_id: COURSE_ID, name: 'PACT September 26' } });
  if (!cohort) throw new Error('September cohort not found');

  const analytics = await analyticsService.getCourseAnalytics(COURSE_ID, cohort.id);

  // Pre/post assessment scores, named per student (internal AAR use — not
  // the anonymous survey path). Mirrors grade.service.js's assessment_scores
  // CTE shape but keeps user identity instead of folding into an aggregate.
  const [prePost] = await sequelize.query(`
    SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
           MAX(g.score) FILTER (WHERE a.lti_resource_link_id = 'assessment-pretest') AS "preScore",
           MAX(g.max_score) FILTER (WHERE a.lti_resource_link_id = 'assessment-pretest') AS "preMax",
           MAX(g.score) FILTER (WHERE a.lti_resource_link_id = 'assessment-posttest') AS "postScore",
           MAX(g.max_score) FILTER (WHERE a.lti_resource_link_id = 'assessment-posttest') AS "postMax"
    FROM enrollments e
    JOIN users u ON u.id = e.user_id AND u.role = 'student'
    LEFT JOIN grades g ON g.user_id = e.user_id
    LEFT JOIN assignments a ON a.id = g.assignment_id AND a.lti_resource_link_id IN ('assessment-pretest', 'assessment-posttest')
    WHERE e.course_id = :courseId AND e.cohort_id = :cohortId
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY u.last_name, u.first_name
  `, { replacements: { courseId: COURSE_ID, cohortId: cohort.id } });

  // Squad roster for context.
  const [squadRows] = await sequelize.query(`
    SELECT sq.number AS "squadNumber", sq.name AS "squadName", sq.victim_code AS "victimCode",
           count(e.user_id)::int AS "memberCount"
    FROM squads sq
    LEFT JOIN enrollments e ON e.squad_id = sq.id AND e.course_id = :courseId
    WHERE sq.cohort_id = :cohortId
    GROUP BY sq.number, sq.name, sq.victim_code
    ORDER BY sq.number
  `, { replacements: { courseId: COURSE_ID, cohortId: cohort.id } });

  // Activity window — earliest/latest submission/grade timestamps, as a proxy
  // for actual course dates since cohorts don't carry explicit start/end fields.
  const [[window]] = await sequelize.query(`
    SELECT MIN(s.submitted_at) AS "firstActivity", MAX(s.submitted_at) AS "lastActivity"
    FROM submissions s
    JOIN enrollments e ON e.user_id = s.user_id AND e.course_id = :courseId
    WHERE e.cohort_id = :cohortId
  `, { replacements: { courseId: COURSE_ID, cohortId: cohort.id } });

  console.log(JSON.stringify({ cohort: { id: cohort.id, name: cohort.name }, analytics, prePost, squadRows, window }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); process.exit(1); });
