'use strict';
const { Cohort, Enrollment } = require('../models');

// Admins, instructors and superadmins browsing the operator-facing views
// (Operations, Case File, Intel Library, Case Timeline, Operator Record) must
// see exactly what has been released to the course's active cohort — never
// whatever their own, often past-cohort, enrollment row would show. Command
// is the only place staff get a different (management) view.
const STAFF_ROLES = ['admin', 'instructor', 'superadmin'];

function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

// The single currently-active cohort (cohorts.is_active) — same rule the
// scoreboard and Live Progress use. No active cohort means nothing is live.
async function getActiveCohortId(courseId) {
  const cohort = await Cohort.findOne({ where: { course_id: courseId, is_active: true }, attributes: ['id'] });
  return cohort?.id ?? null;
}

// A staff member's own enrollment only counts when it is in the active
// cohort; otherwise they observe that cohort with no squad, timeline or
// grades of their own (a July instructor must not see July's squad data).
async function getActiveCohortEnrollment(courseId, userId) {
  const cohortId = await getActiveCohortId(courseId);
  if (!cohortId) return null;
  return Enrollment.findOne({ where: { user_id: userId, course_id: courseId, cohort_id: cohortId } });
}

// What staff act as when working an assignment: their own active-cohort
// enrollment if they have one, otherwise a squadless member of the active
// cohort. null when no cohort is active (nothing is live to work).
async function resolveStaffEnrollment(courseId, userId) {
  const cohortId = await getActiveCohortId(courseId);
  if (!cohortId) return null;
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId, cohort_id: cohortId } });
  return enrollment ?? { user_id: userId, course_id: courseId, cohort_id: cohortId, squad_id: null };
}

module.exports = { STAFF_ROLES, isStaffRole, getActiveCohortId, getActiveCohortEnrollment, resolveStaffEnrollment };
