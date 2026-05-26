'use strict';
const courseService = require('../services/course.service');

async function list(req, res, next) {
  try { return res.json(await courseService.listCourses(req.query, req.user)); }
  catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try { return res.json(await courseService.getCourseById(req.params.id)); }
  catch (err) { return next(err); }
}

async function create(req, res, next) {
  try { return res.status(201).json(await courseService.createCourse(req.body, req.user)); }
  catch (err) { return next(err); }
}

async function update(req, res, next) {
  try { return res.json(await courseService.updateCourse(req.params.id, req.body, req.user)); }
  catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try { await courseService.deleteCourse(req.params.id); return res.status(204).send(); }
  catch (err) { return next(err); }
}

async function listModules(req, res, next) {
  try { return res.json(await courseService.listModules(req.params.id)); }
  catch (err) { return next(err); }
}

async function createModule(req, res, next) {
  try { return res.status(201).json(await courseService.createModule(req.params.id, req.body)); }
  catch (err) { return next(err); }
}

async function updateModule(req, res, next) {
  try { return res.json(await courseService.updateModule(req.params.id, req.params.mid, req.body)); }
  catch (err) { return next(err); }
}

async function removeModule(req, res, next) {
  try { await courseService.deleteModule(req.params.id, req.params.mid); return res.status(204).send(); }
  catch (err) { return next(err); }
}

module.exports = { list, getOne, create, update, remove, listModules, createModule, updateModule, removeModule };
