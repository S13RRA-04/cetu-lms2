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

/* ─────────────────────────────────────────────────────────────────────────────
   Course Effectiveness
   Returns per-assignment: pass rate, grading turnaround, backlog, score
   progression, and student engagement funnel — for program managers.
───────────────────────────────────────────────────────────────────────────── */
async function getCourseEffectiveness(courseId, cohortId) {
  const { sequelize } = require('../config/database');
  const cohortFilter  = cohortId ? `AND e.cohort_id = '${cohortId.replace(/'/g, "''")}'::uuid` : '';

  const rows = await sequelize.query(
    `SELECT
       a.id                                                                         AS "assignmentId",
       a.title,
       a.order_index                                                                AS "orderIndex",
       a.max_score                                                                  AS "maxScore",

       /* enrollment denominator */
       COUNT(DISTINCT e.user_id)                                                   AS "enrolledCount",

       /* submission funnel */
       COUNT(DISTINCT s.user_id)
         FILTER (WHERE s.status IN ('submitted','graded'))                         AS "submittedCount",

       /* grading counts */
       COUNT(DISTINCT g.user_id)                                                   AS "gradedCount",
       COUNT(DISTINCT s.user_id)
         FILTER (WHERE s.status IN ('submitted','graded') AND g.user_id IS NULL)   AS "ungradedCount",

       /* pass rate: scored >= 60 % of max_score */
       COUNT(DISTINCT g.user_id)
         FILTER (WHERE g.score IS NOT NULL
                   AND a.max_score > 0
                   AND g.score / a.max_score >= 0.6)                               AS "passedCount",

       /* average grade % (for score-progression curve) */
       ROUND(AVG(g.score / NULLIF(a.max_score, 0) * 100)::numeric, 1)             AS "avgPct",

       /* manual grading turnaround (hours) — excludes auto-grades where graded_by IS NULL */
       ROUND(AVG(
         EXTRACT(EPOCH FROM (g.graded_at - s.submitted_at)) / 3600.0
       ) FILTER (WHERE g.graded_by IS NOT NULL
                   AND g.graded_at IS NOT NULL
                   AND s.submitted_at IS NOT NULL
                   AND g.graded_at > s.submitted_at)::numeric, 1)                  AS "avgTurnaroundHours",

       /* oldest submission still awaiting a grade */
       MIN(s.submitted_at)
         FILTER (WHERE s.status IN ('submitted','graded') AND g.user_id IS NULL)   AS "oldestUngradedAt"

     FROM assignments a
     JOIN enrollments e ON e.course_id = a.course_id
     JOIN users       u ON u.id = e.user_id AND u.role = 'student'
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = e.user_id
     LEFT JOIN grades     g ON g.assignment_id = a.id AND g.user_id = e.user_id
     WHERE a.course_id = :courseId AND a.is_published = true
       ${cohortFilter}
     GROUP BY a.id, a.title, a.order_index, a.max_score, a.created_at
     ORDER BY a.order_index, a.created_at`,
    { replacements: { courseId }, type: sequelize.QueryTypes.SELECT }
  );

  const totalEnrolled = rows.length > 0 ? parseInt(rows[0].enrolledCount, 10) : 0;

  /* overall grading backlog across all assignments */
  const totalUngraded = rows.reduce((s, r) => s + parseInt(r.ungradedCount, 10), 0);
  const totalGraded   = rows.reduce((s, r) => s + parseInt(r.gradedCount, 10), 0);
  const totalSubmit   = rows.reduce((s, r) => s + parseInt(r.submittedCount, 10), 0);
  const gradingCompletion = totalSubmit > 0 ? Math.round(totalGraded / totalSubmit * 100) : null;

  const manualRows = rows.filter((r) => r.avgTurnaroundHours !== null);
  const avgTurnaround = manualRows.length
    ? Math.round(manualRows.reduce((s, r) => s + parseFloat(r.avgTurnaroundHours), 0) / manualRows.length * 10) / 10
    : null;

  return {
    summary: {
      totalUngraded,
      gradingCompletion,
      avgTurnaroundHours: avgTurnaround,
      oldestUngradedAt: rows.reduce((oldest, r) => {
        if (!r.oldestUngradedAt) return oldest;
        return !oldest || new Date(r.oldestUngradedAt) < new Date(oldest) ? r.oldestUngradedAt : oldest;
      }, null),
    },
    assignments: rows.map((r) => ({
      assignmentId:       r.assignmentId,
      title:              r.title,
      orderIndex:         parseInt(r.orderIndex, 10),
      maxScore:           parseFloat(r.maxScore ?? 0),
      enrolledCount:      parseInt(r.enrolledCount, 10),
      submittedCount:     parseInt(r.submittedCount, 10),
      gradedCount:        parseInt(r.gradedCount, 10),
      ungradedCount:      parseInt(r.ungradedCount, 10),
      passedCount:        parseInt(r.passedCount, 10),
      avgPct:             r.avgPct             !== null ? parseFloat(r.avgPct)             : null,
      avgTurnaroundHours: r.avgTurnaroundHours !== null ? parseFloat(r.avgTurnaroundHours) : null,
      oldestUngradedAt:   r.oldestUngradedAt   ?? null,
      engagementRate:     parseInt(r.enrolledCount, 10) > 0
        ? Math.round(parseInt(r.submittedCount, 10) / parseInt(r.enrolledCount, 10) * 100) : 0,
      passRate: parseInt(r.gradedCount, 10) > 0
        ? Math.round(parseInt(r.passedCount, 10) / parseInt(r.gradedCount, 10) * 100) : null,
      gradingRate: parseInt(r.submittedCount, 10) > 0
        ? Math.round(parseInt(r.gradedCount, 10) / parseInt(r.submittedCount, 10) * 100) : null,
    })),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Program Overview
   One row per course with health KPIs; grouped by instructor for unit
   management to assess how program managers are running their courses.
───────────────────────────────────────────────────────────────────────────── */
async function getProgramOverview() {
  const { sequelize } = require('../config/database');

  const rows = await sequelize.query(
    `WITH student_e AS (
       SELECT e.user_id, e.course_id, e.cohort_id
       FROM   enrollments e
       JOIN   users u ON u.id = e.user_id AND u.role = 'student'
     )
     SELECT
       c.id                                                                          AS "courseId",
       c.title                                                                       AS "courseTitle",
       c.status                                                                      AS "courseStatus",
       u.id                                                                          AS "instructorId",
       COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned')                  AS "instructorName",
       u.email                                                                       AS "instructorEmail",
       COUNT(DISTINCT se.user_id)                                                   AS "enrolledCount",
       COUNT(DISTINCT a.id) FILTER (WHERE a.is_published = true)                   AS "assignmentCount",

       /* avg grade % across all graded submissions */
       ROUND(AVG(g.score / NULLIF(g.max_score, 0) * 100)::numeric, 1)              AS "avgGradePct",

       /* submission rate = students who submitted ≥1 assignment / enrolled */
       ROUND(
         COUNT(DISTINCT s.user_id)
           FILTER (WHERE s.status IN ('submitted','graded')) * 100.0
           / NULLIF(COUNT(DISTINCT se.user_id), 0)
       , 1)                                                                          AS "submissionRate",

       /* grading backlog: submitted with no grade */
       COUNT(DISTINCT s.id)
         FILTER (WHERE s.status IN ('submitted','graded') AND g.user_id IS NULL)   AS "ungradedCount",

       /* avg manual grading turnaround in hours */
       ROUND(AVG(
         EXTRACT(EPOCH FROM (g.graded_at - s.submitted_at)) / 3600.0
       ) FILTER (WHERE g.graded_by IS NOT NULL
                   AND g.graded_at IS NOT NULL
                   AND s.submitted_at IS NOT NULL
                   AND g.graded_at > s.submitted_at)::numeric, 1)                  AS "avgTurnaroundHours",

       /* oldest ungraded submission */
       MIN(s.submitted_at)
         FILTER (WHERE s.status IN ('submitted','graded') AND g.user_id IS NULL)   AS "oldestUngradedAt",

       /* at-risk: students averaging < 60 % across graded work */
       COUNT(DISTINCT sub_avg.user_id)
         FILTER (WHERE sub_avg.avg_pct < 60)                                        AS "atRiskCount"

     FROM courses c
     LEFT JOIN users u ON u.id = c.instructor_id
     LEFT JOIN student_e se ON se.course_id = c.id
     LEFT JOIN assignments a ON a.course_id = c.id
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = se.user_id
     LEFT JOIN grades g ON g.assignment_id = a.id AND g.user_id = se.user_id
     /* per-student average for at-risk count */
     LEFT JOIN (
       SELECT g2.user_id,
              a2.course_id,
              AVG(g2.score / NULLIF(g2.max_score, 0) * 100) AS avg_pct
       FROM grades g2
       JOIN assignments a2 ON a2.id = g2.assignment_id
       GROUP BY g2.user_id, a2.course_id
     ) sub_avg ON sub_avg.user_id = se.user_id AND sub_avg.course_id = c.id
     GROUP BY c.id, c.title, c.status, u.id, u.first_name, u.last_name, u.email
     ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST, c.title`,
    { type: sequelize.QueryTypes.SELECT }
  );

  /* ── Compute a simple health score (0–100) per course ── */
  const scored = rows.map((r) => {
    const enrolled     = parseInt(r.enrolledCount, 10);
    const avgGrade     = r.avgGradePct     !== null ? parseFloat(r.avgGradePct)     : null;
    const subRate      = r.submissionRate  !== null ? parseFloat(r.submissionRate)  : null;
    const ungraded     = parseInt(r.ungradedCount, 10);
    const atRisk       = parseInt(r.atRiskCount,   10);

    /* Health components (each 0–100, weighted):
       40% avg grade, 30% submission rate, 20% grading completeness, 10% at-risk penalty */
    const gradeScore   = avgGrade  !== null ? Math.min(avgGrade, 100)  : null;
    const subScore     = subRate   !== null ? Math.min(subRate, 100)   : null;
    const gradingTotal = parseInt(r.ungradedCount, 10) + (rows.reduce ? 0 : 0); // handled below
    const backlogPenalty = enrolled > 0 ? Math.max(0, 100 - (ungraded / Math.max(enrolled, 1)) * 200) : 100;
    const atRiskPenalty  = enrolled > 0 ? Math.max(0, 100 - (atRisk  / Math.max(enrolled, 1)) * 150) : 100;

    const components = [gradeScore, subScore].filter((v) => v !== null);
    const baseHealth = components.length
      ? components.reduce((a, b) => a + b, 0) / components.length
      : null;

    const healthScore = baseHealth !== null
      ? Math.round(baseHealth * 0.7 + backlogPenalty * 0.2 + atRiskPenalty * 0.1)
      : null;

    return {
      courseId:           r.courseId,
      courseTitle:        r.courseTitle,
      courseStatus:       r.courseStatus,
      instructorId:       r.instructorId    ?? null,
      instructorName:     r.instructorName  ?? 'Unassigned',
      instructorEmail:    r.instructorEmail ?? null,
      enrolledCount:      enrolled,
      assignmentCount:    parseInt(r.assignmentCount, 10),
      avgGradePct:        avgGrade,
      submissionRate:     subRate,
      ungradedCount:      ungraded,
      atRiskCount:        atRisk,
      avgTurnaroundHours: r.avgTurnaroundHours !== null ? parseFloat(r.avgTurnaroundHours) : null,
      oldestUngradedAt:   r.oldestUngradedAt   ?? null,
      healthScore,
    };
  });

  return scored;
}

module.exports = { getCourseAnalytics, getCourseEffectiveness, getProgramOverview };
