'use strict';
const assignmentService  = require('../services/assignment.service');
const gradeService       = require('../services/grade.service');
const submissionService  = require('../services/submission.service');
const analyticsService   = require('../services/analytics.service');
const surveyResultsService = require('../services/surveyResults.service');

async function getSurveyResults(req, res, next) {
  try {
    res.set({ 'Cache-Control': 'private, no-store', Pragma: 'no-cache', Expires: '0', Vary: 'Authorization' });
    return res.json(await surveyResultsService.getSurveyResults(req.params.aid));
  }
  catch (err) { return next(err); }
}

async function getMyGrades(req, res, next) {
  try { return res.json(await gradeService.getGradesForUser(req.user.id)); }
  catch (err) { return next(err); }
}

async function getScoreboard(req, res, next) {
  try { return res.json(await gradeService.getScoreboard(req.params.id)); }
  catch (err) { return next(err); }
}

async function getSquadScoreboard(req, res, next) {
  try { return res.json(await gradeService.getSquadScoreboard(req.params.id)); }
  catch (err) { return next(err); }
}

async function getCourseGrades(req, res, next) {
  try { return res.json(await gradeService.getCourseGrades(req.params.id, req.query.cohort_id ?? null, req.query.user_id ?? null)); }
  catch (err) { return next(err); }
}

async function getCourseAnalytics(req, res, next) {
  try { return res.json(await analyticsService.getCourseAnalytics(req.params.id, req.query.cohort_id ?? null)); }
  catch (err) { return next(err); }
}

async function getCourseEffectiveness(req, res, next) {
  try { return res.json(await analyticsService.getCourseEffectiveness(req.params.id, req.query.cohort_id ?? null)); }
  catch (err) { return next(err); }
}

async function listByCourse(req, res, next) {
  try {
    const isStudent = req.user.role === 'student';
    // Operations/Case File/Intel Library/AppShell nav are "what would I see"
    // views for whoever is looking, including instructors/admins/superadmins
    // browsing their own dashboard — scoped to the viewer's own enrollment
    // (cohort/squad) and professional_role, exactly like a student's list.
    // Only the Command page's explicit management view (`manage=1`, itself
    // restricted to non-students) is meant to return every assignment in the
    // course regardless of who's looking, for authoring purposes.
    const manage = !isStudent && req.query.manage === '1';
    const data = manage
      ? await assignmentService.listByCourse(req.params.id, req.query, { includeUnpublished: true })
      : await assignmentService.listForStudent(req.params.id, req.user.id);
    return res.json(data);
  }
  catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try {
    // Same "what would I see" scoping as listByCourse above — every viewer
    // gets their own enrollment/grade-gated view, not just students. The
    // Command console's rubric/model-answer editing UI reads assignment data
    // from the separate manage=1 list (already unfiltered), never from here.
    return res.json(await assignmentService.getById(req.params.aid, req.user.id));
  }
  catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { return res.status(201).json(await assignmentService.create(req.params.id, req.body)); }
  catch (err) { return next(err); }
}

async function update(req, res, next) {
  try { return res.json(await assignmentService.update(req.params.aid, req.body)); }
  catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try { await assignmentService.remove(req.params.aid); return res.status(204).send(); }
  catch (err) { return next(err); }
}

async function getGrades(req, res, next) {
  try { return res.json(await gradeService.getGradesForAssignment(req.params.aid)); }
  catch (err) { return next(err); }
}

async function upsertGrade(req, res, next) {
  try {
    const grade = await gradeService.upsertGrade(req.params.aid, req.params.uid, req.body, req.user.id);
    return res.json(grade);
  } catch (err) { return next(err); }
}

async function unlockForCohort(req, res, next) {
  try {
    const unlock = await assignmentService.unlockForCohort(
      req.params.aid, req.body.cohort_id, req.user.id, req.body.squad_id ?? null,
    );
    return res.status(201).json(unlock);
  } catch (err) { return next(err); }
}

async function lockForCohort(req, res, next) {
  try {
    await assignmentService.lockForCohort(req.params.aid, req.body.cohort_id, req.body.squad_id ?? null);
    return res.status(204).end();
  } catch (err) { return next(err); }
}

async function getProgress(req, res, next) {
  try { return res.json(await submissionService.getProgressForAssignment(req.params.aid, req.query)); }
  catch (err) { return next(err); }
}

async function getLiveOverview(req, res, next) {
  try { return res.json(await assignmentService.getLiveOverview(req.params.id, req.query)); }
  catch (err) { return next(err); }
}

async function gradeSquad(req, res, next) {
  try {
    const grades = await gradeService.gradeSquad(req.params.aid, req.params.squadId, req.body, req.user.id);
    return res.json(grades);
  } catch (err) { return next(err); }
}

module.exports = { listByCourse, getOne, create, update, remove, getGrades, upsertGrade, unlockForCohort, lockForCohort, getProgress, getLiveOverview, gradeSquad, getMyGrades, getScoreboard, getSquadScoreboard, getCourseGrades, getCourseAnalytics, getCourseEffectiveness, getSurveyResults };
