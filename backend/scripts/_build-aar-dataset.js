'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const analyticsService = require('../src/services/analytics.service');
const surveyResultsService = require('../src/services/surveyResults.service');
const { Cohort, Assignment } = require('../src/models');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

// Roster-cleanliness exclusions, found by inspecting duplicate display names
// in the raw query output before trusting it for a leadership report:
//  - Albert Ta's second account is already system-flagged as a duplicate
//    (is_active:false, email literally prefixed "duplicate+...invalid").
//  - Alison Garner has two active accounts under different personal emails;
//    one has 23 submissions and a real last_login, the other has 1
//    submission and has never logged in — treated as an abandoned duplicate
//    signup, not a second student.
//  - "Tanya X" <codyhitson@proton.me> matches the pattern this codebase's
//    own comments repeatedly flag elsewhere (grade.service.js et al.): a
//    staff/admin preview account sitting inside a student cohort for
//    testing, not a real trainee.
// All three are excluded from AAR figures; noted explicitly in the report's
// data-notes section rather than silently dropped.
const EXCLUDED_USER_IDS = new Set([
  '3fb3d17d-0743-424c-915b-57151e2d2064', // Albert Ta — system-flagged duplicate
  '4542d6a3-68a4-47f1-a147-675d19121332', // Alison Garner — unused duplicate signup
  '7d12b3ac-1c0a-4014-ab33-64ea9b02d2c8', // "Tanya X" — likely staff preview account
]);

async function main() {
  const cohort = await Cohort.findOne({ where: { course_id: COURSE_ID, name: 'PACT September 26' } });
  if (!cohort) throw new Error('September cohort not found');

  const analytics = await analyticsService.getCourseAnalytics(COURSE_ID, cohort.id);

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

  const [squadRows] = await sequelize.query(`
    SELECT sq.number AS "squadNumber", sq.victim_code AS "victimCode",
           count(e.user_id)::int AS "memberCount"
    FROM squads sq
    LEFT JOIN enrollments e ON e.squad_id = sq.id AND e.course_id = :courseId
    WHERE sq.cohort_id = :cohortId
    GROUP BY sq.number, sq.victim_code
    ORDER BY sq.number
  `, { replacements: { courseId: COURSE_ID, cohortId: cohort.id } });

  const survey = await Assignment.findOne({ where: { course_id: COURSE_ID, type: 'survey' }, attributes: ['id'] });
  const surveyResults = survey ? await surveyResultsService.getSurveyResults(survey.id, cohort.id) : null;

  // Merge participation (analytics.students) with pre/post by userId into one
  // roster, dropping the excluded duplicate/staff accounts before anything
  // downstream (aggregates, distribution) gets computed from it.
  const analyticsByUser = Object.fromEntries(analytics.students.map((s) => [s.userId, s]));
  const roster = prePost.filter((r) => !EXCLUDED_USER_IDS.has(r.userId)).map((r) => {
    const a = analyticsByUser[r.userId] ?? {};
    const preScore = r.preScore !== null ? parseFloat(r.preScore) : null;
    const preMax   = r.preMax   !== null ? parseFloat(r.preMax)   : null;
    const postScore = r.postScore !== null ? parseFloat(r.postScore) : null;
    const postMax   = r.postMax   !== null ? parseFloat(r.postMax)   : null;
    const prePct  = preScore !== null && preMax > 0 ? (preScore / preMax) * 100 : null;
    const postPct = postScore !== null && postMax > 0 ? (postScore / postMax) * 100 : null;
    const deltaPct = prePct !== null && postPct !== null ? postPct - prePct : null;
    return {
      userId: r.userId,
      name: `${r.lastName}, ${r.firstName}`.trim(),
      submittedCount: a.submittedCount ?? 0,
      gradedCount: a.gradedCount ?? 0,
      avgPct: a.avgPct ?? null,
      totalScore: a.totalScore ?? 0,
      totalMax: a.totalMax ?? 0,
      preScore, preMax, prePct,
      postScore, postMax, postPct,
      deltaPct,
    };
  });

  const withDelta = roster.filter((r) => r.deltaPct !== null);
  const avgDelta = withDelta.length ? withDelta.reduce((s, r) => s + r.deltaPct, 0) / withDelta.length : null;
  const avgPre   = withDelta.length ? withDelta.reduce((s, r) => s + r.prePct, 0) / withDelta.length : null;
  const avgPost  = withDelta.length ? withDelta.reduce((s, r) => s + r.postPct, 0) / withDelta.length : null;

  // Recomputed from the cleaned roster rather than trusting analytics.summary/
  // gradeDistribution directly — those come from getCourseAnalytics(), which
  // has no way to know about the 3 excluded accounts above, so its
  // enrolledCount/avgGradePct/distribution are all still polluted by them.
  // Separately: getCourseAnalytics' own atRiskCount is NOT reused here at
  // all — its submission-rate math divides each student's submittedCount by
  // the COURSE-WIDE total published-assignment count (167), not by whatever
  // subset role_filters actually made available to that specific student, so
  // it flags all 36 raw enrollees "at risk" even though grades are uniformly
  // strong — a real bug in that function, out of scope to fix here, but
  // wrong to launder into a leadership report as if it were signal.
  const gradedRoster = roster.filter((r) => r.avgPct !== null);
  const avgGradePctClean = gradedRoster.length
    ? Math.round(gradedRoster.reduce((s, r) => s + r.avgPct, 0) / gradedRoster.length)
    : null;
  const gradeDistributionClean = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of gradedRoster) {
    const p = r.avgPct;
    if      (p >= 90) gradeDistributionClean.A++;
    else if (p >= 80) gradeDistributionClean.B++;
    else if (p >= 70) gradeDistributionClean.C++;
    else if (p >= 60) gradeDistributionClean.D++;
    else              gradeDistributionClean.F++;
  }

  const out = {
    cohort: { id: cohort.id, name: cohort.name, startDate: cohort.start_date, endDate: cohort.end_date },
    summary: {
      enrolledCount: roster.length,
      gradedStudentCount: gradedRoster.length,
      avgGradePct: avgGradePctClean,
    },
    gradeDistribution: gradeDistributionClean,
    dataNotes: {
      rawEnrolledCount: analytics.summary.enrolledCount,
      excludedCount: EXCLUDED_USER_IDS.size,
      excludedReason: 'System-flagged duplicate account, an unused duplicate signup (never logged in), and one account matching this course\'s staff-preview-account pattern — all excluded from every figure in this report.',
    },
    squadRows,
    roster,
    prePostAggregate: {
      studentsWithBoth: withDelta.length,
      totalStudents: roster.length,
      avgPrePct: avgPre,
      avgPostPct: avgPost,
      avgDeltaPct: avgDelta,
    },
    surveyResults,
  };

  fs.writeFileSync(path.join(__dirname, '_aar-dataset.json'), JSON.stringify(out, null, 2));
  console.log('Wrote _aar-dataset.json');
  console.log('Roster size:', roster.length, '| with both pre+post:', withDelta.length);
  console.log('Avg pre:', avgPre?.toFixed(1), '| Avg post:', avgPost?.toFixed(1), '| Avg delta:', avgDelta?.toFixed(1));
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e.message); console.error(e.stack); process.exit(1); });
