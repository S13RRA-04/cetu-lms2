'use strict';
const enrollmentService = require('../services/enrollment.service');
const { Enrollment, Cohort, Squad, User } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../config/constants');

const MANAGER_ROLES = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.INSTRUCTOR];

async function listByCourse(req, res, next) {
  try { return res.json(await enrollmentService.listByCourse(req.params.id)); }
  catch (err) { return next(err); }
}

async function enroll(req, res, next) {
  try {
    // Admin/instructor can enroll any user with any role; a self-service
    // caller may only enroll themselves, and only as a student — this used
    // to be a comment, not a check, which meant any authenticated student
    // could pass an arbitrary user_id (enroll someone else without consent)
    // or role (e.g. "instructor") in the request body.
    const isManager = MANAGER_ROLES.includes(req.user.role);
    if (!isManager && (req.body.user_id || req.body.role)) {
      throw new ForbiddenError('Only an admin or instructor can enroll another user or assign a non-student role');
    }
    const userId = isManager ? (req.body.user_id || req.user.id) : req.user.id;
    const role   = isManager ? (req.body.role    || 'student')   : 'student';
    const result = await enrollmentService.enroll(req.params.id, userId, role);
    return res.status(201).json(result);
  } catch (err) { return next(err); }
}

async function updateEnrollment(req, res, next) {
  try { return res.json(await enrollmentService.updateEnrollment(req.params.id, req.params.uid, req.body)); }
  catch (err) { return next(err); }
}

async function unenroll(req, res, next) {
  try { return res.json(await enrollmentService.unenroll(req.params.id, req.params.uid)); }
  catch (err) { return next(err); }
}

async function getMyEnrollment(req, res, next) {
  try {
    const enrollment = await Enrollment.findOne({
      where: { user_id: req.user.id, course_id: req.params.id },
      include: [
        {
          model: Cohort,
          as:    'cohort',
          attributes: ['id', 'name', 'start_date', 'end_date', 'is_active', 'target_revealed'],
        },
        {
          model: Squad,
          as:    'squad',
          attributes: ['id', 'number', 'name', 'victim_code'],
          include: [{
            model:      User,
            as:         'students',
            attributes: ['id', 'first_name', 'last_name', 'professional_role'],
            through:    { attributes: [] },
          }],
        },
      ],
    });
    if (!enrollment) throw new NotFoundError('Enrollment');
    return res.json(enrollment);
  } catch (err) { return next(err); }
}

module.exports = { listByCourse, enroll, updateEnrollment, unenroll, getMyEnrollment };
