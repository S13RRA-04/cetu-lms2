'use strict';
const assignmentService = require('../services/assignment.service');
const gradeService      = require('../services/grade.service');

async function listByCourse(req, res, next) {
  try { return res.json(await assignmentService.listByCourse(req.params.id, req.query)); }
  catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try { return res.json(await assignmentService.getById(req.params.aid)); }
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

module.exports = { listByCourse, getOne, create, update, remove, getGrades, upsertGrade };
