'use strict';

async function getCourseAnalytics(courseId, cohortId) {
  const { sequelize } = require('../config/database');

  const cohortFilter = cohortId
    ? `AND e.cohort_id = '${cohortId.replace(/'/g, "''")}'::uuid`
    : '';

  const [assignmentRows, studentRows, cohortRows] = await Promise.all([

    /* ── Assignment performance ── */
    sequelize.query(
      `SELECT
         a.id                                                              AS "assignmentId",
         a.title,
         a.max_score                                                       AS "maxScore",
         a.order_index                                                     AS "orderIndex",
         COUNT(DISTINCT e.user_id)                                        AS "enrolledCount",
         COUNT(DISTINCT s.user_id)
           FILTER (WHERE s.status IN ('submitted','graded'))              AS "submittedCount",
         COUNT(DISTINCT g.user_id)                                        AS "gradedCount",
         ROUND(AVG(g.score)::numeric, 1)                                  AS "avgScore",
         MIN(g.score)                                                      AS "minScore",
         MAX(g.score)                                                      AS "maxScore2",
         CASE WHEN a.max_score > 0
           THEN ROUND(AVG(g.score / a.max_score * 100)::numeric, 1)
         END                                                               AS "avgPct"
       FROM assignments a
       JOIN enrollments e ON e.course_id = a.course_id
       JOIN users u ON u.id = e.user_id AND u.role = 'student'
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = e.user_id
       LEFT JOIN grades g ON g.assignment_id = a.id AND g.user_id = e.user_id
       WHERE a.course_id = :courseId AND a.is_published = true
         ${cohortFilter}
       GROUP BY a.id, a.title, a.max_score, a.order_index, a.created_at
       ORDER BY a.order_index, a.created_at`,
      { replacements: { courseId }, type: sequelize.QueryTypes.SELECT }
    ),

    /* ── Per-student stats ── */
    sequelize.query(
      `SELECT
         u.id                                                              AS "userId",
         u.first_name                                                      AS "firstName",
         u.last_name                                                       AS "lastName",
         u.email,
         e.cohort_id                                                       AS "cohortId",
         c.name                                                            AS "cohortName",
         COUNT(DISTINCT s.assignment_id)
           FILTER (WHERE s.status IN ('submitted','graded'))              AS "submittedCount",
         COUNT(DISTINCT g.assignment_id)                                  AS "gradedCount",
         ROUND(AVG(g.score / NULLIF(g.max_score,0) * 100)::numeric, 1)   AS "avgPct",
         COALESCE(SUM(g.score), 0)                                        AS "totalScore",
         COALESCE(SUM(g.max_score), 0)                                    AS "totalMax"
       FROM enrollments e
       JOIN users u ON u.id = e.user_id AND u.role = 'student'
       LEFT JOIN cohorts c ON c.id = e.cohort_id
       LEFT JOIN submissions s
         ON s.user_id = e.user_id
        AND s.assignment_id IN (
              SELECT id FROM assignments
              WHERE course_id = :courseId AND is_published = true)
       LEFT JOIN grades g
         ON g.user_id = e.user_id
        AND g.assignment_id IN (
              SELECT id FROM assignments
              WHERE course_id = :courseId AND is_published = true)
       WHERE e.course_id = :courseId
         ${cohortFilter}
       GROUP BY u.id, u.first_name, u.last_name, u.email, e.cohort_id, c.name
       ORDER BY u.last_name, u.first_name`,
      { replacements: { courseId }, type: sequelize.QueryTypes.SELECT }
    ),

    /* ── Cohort breakdown ── */
    sequelize.query(
      `SELECT
         c.id                                                              AS "cohortId",
         c.name                                                            AS "cohortName",
         COUNT(DISTINCT e.user_id)                                        AS "studentCount",
         ROUND(AVG(g.score / NULLIF(g.max_score,0) * 100)::numeric, 1)   AS "avgPct",
         ROUND(
           COUNT(DISTINCT s.user_id)
             FILTER (WHERE s.status IN ('submitted','graded')) * 100.0
             / NULLIF(COUNT(DISTINCT e.user_id), 0)
         , 1)                                                              AS "submissionRate"
       FROM cohorts c
       JOIN enrollments e ON e.cohort_id = c.id AND e.course_id = :courseId
       JOIN users u ON u.id = e.user_id AND u.role = 'student'
       LEFT JOIN grades g
         ON g.user_id = e.user_id
        AND g.assignment_id IN (
              SELECT id FROM assignments
              WHERE course_id = :courseId AND is_published = true)
       LEFT JOIN submissions s
         ON s.user_id = e.user_id
        AND s.assignment_id IN (
              SELECT id FROM assignments
              WHERE course_id = :courseId AND is_published = true)
       GROUP BY c.id, c.name
       ORDER BY c.name`,
      { replacements: { courseId }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  /* ── Derive summary numbers ── */
  const totalAssignments = assignmentRows.length;
  const enrolledCount    = studentRows.length;

  const submittingCount = studentRows.filter(
    (s) => parseInt(s.submittedCount, 10) > 0
  ).length;

  const gradedStudents  = studentRows.filter((s) => s.avgPct !== null);
  const avgGradePct     = gradedStudents.length
    ? Math.round(gradedStudents.reduce((a, s) => a + parseFloat(s.avgPct), 0) / gradedStudents.length)
    : null;

  const AT_RISK_PCT        = 60;
  const AT_RISK_SUBMIT_MIN = 0.5;  // must have submitted ≥50% of assignments

  const atRiskStudents = studentRows.filter((s) => {
    const pct      = s.avgPct !== null ? parseFloat(s.avgPct) : null;
    const subRate  = totalAssignments > 0
      ? parseInt(s.submittedCount, 10) / totalAssignments
      : 1;
    return (pct !== null && pct < AT_RISK_PCT) || subRate < AT_RISK_SUBMIT_MIN;
  });

  /* ── Grade distribution (by student avg pct) ── */
  const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  gradedStudents.forEach((s) => {
    const p = parseFloat(s.avgPct);
    if      (p >= 90) dist.A++;
    else if (p >= 80) dist.B++;
    else if (p >= 70) dist.C++;
    else if (p >= 60) dist.D++;
    else              dist.F++;
  });

  /* ── Shape assignment rows ── */
  const assignments = assignmentRows.map((r) => ({
    assignmentId:   r.assignmentId,
    title:          r.title,
    maxScore:       parseFloat(r.maxScore ?? 0),
    orderIndex:     parseInt(r.orderIndex, 10),
    enrolledCount:  parseInt(r.enrolledCount, 10),
    submittedCount: parseInt(r.submittedCount, 10),
    gradedCount:    parseInt(r.gradedCount, 10),
    avgScore:       r.avgScore    !== null ? parseFloat(r.avgScore)  : null,
    minScore:       r.minScore    !== null ? parseFloat(r.minScore)  : null,
    maxScore2:      r.maxScore2   !== null ? parseFloat(r.maxScore2) : null,
    avgPct:         r.avgPct      !== null ? parseFloat(r.avgPct)    : null,
    submissionRate: parseInt(r.enrolledCount, 10) > 0
      ? Math.round(parseInt(r.submittedCount, 10) / parseInt(r.enrolledCount, 10) * 100)
      : 0,
  }));

  return {
    summary: {
      enrolledCount,
      submittingCount,
      avgGradePct,
      totalAssignments,
      atRiskCount: atRiskStudents.length,
      gradedStudentCount: gradedStudents.length,
    },
    assignments,
    students: studentRows.map((s) => ({
      userId:         s.userId,
      firstName:      s.firstName,
      lastName:       s.lastName,
      email:          s.email,
      cohortId:       s.cohortId,
      cohortName:     s.cohortName,
      submittedCount: parseInt(s.submittedCount, 10),
      gradedCount:    parseInt(s.gradedCount, 10),
      avgPct:         s.avgPct !== null ? parseFloat(s.avgPct) : null,
      totalScore:     parseFloat(s.totalScore),
      totalMax:       parseFloat(s.totalMax),
      isAtRisk:       atRiskStudents.some((r) => r.userId === s.userId),
    })),
    cohorts: cohortRows.map((r) => ({
      cohortId:       r.cohortId,
      cohortName:     r.cohortName,
      studentCount:   parseInt(r.studentCount, 10),
      avgPct:         r.avgPct         !== null ? parseFloat(r.avgPct)         : null,
      submissionRate: r.submissionRate !== null ? parseFloat(r.submissionRate) : null,
    })),
    gradeDistribution: dist,
  };
}

module.exports = { getCourseAnalytics };
