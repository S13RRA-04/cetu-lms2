'use strict';
const { Router }   = require('express');
const ctrl         = require('../controllers/course.controller');
const enrollCtrl   = require('../controllers/enrollment.controller');
const assignCtrl   = require('../controllers/assignment.controller');
const contentCtrl  = require('../controllers/contentItem.controller');
const subCtrl      = require('../controllers/submission.controller');
const cohortCtrl   = require('../controllers/cohort.controller');
const squadCtrl    = require('../controllers/squad.controller');
const { requireAuth, requireInstructor, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const {
  createCourseSchema, updateCourseSchema,
  createModuleSchema, updateModuleSchema,
} = require('../validators/course.validator');
const { createAssignmentSchema, updateAssignmentSchema, gradeSchema, unlockSchema } = require('../validators/assignment.validator');

const router = Router();

// Courses
router.get('/',    requireAuth,                    ctrl.list);
router.post('/',   requireAuth, requireInstructor, validate(createCourseSchema), auditLog('create', 'course'), ctrl.create);
router.get('/:id', requireAuth,                    ctrl.getOne);
router.put('/:id', requireAuth, requireInstructor, validate(updateCourseSchema), auditLog('update', 'course'), ctrl.update);
router.delete('/:id', requireAuth, requireAdmin,   auditLog('delete', 'course'), ctrl.remove);

// Modules (nested under course)
router.get('/:id/modules',          requireAuth,                    ctrl.listModules);
router.post('/:id/modules',         requireAuth, requireInstructor, validate(createModuleSchema), auditLog('create', 'module'), ctrl.createModule);
router.put('/:id/modules/:mid',     requireAuth, requireInstructor, validate(updateModuleSchema), auditLog('update', 'module'), ctrl.updateModule);
router.delete('/:id/modules/:mid',  requireAuth, requireInstructor, auditLog('delete', 'module'), ctrl.removeModule);

// Enrollments (nested under course)
router.get('/:id/enrollment/me',        requireAuth,                    enrollCtrl.getMyEnrollment);
router.get('/:id/enrollments',          requireAuth, requireInstructor, enrollCtrl.listByCourse);
router.post('/:id/enroll',              requireAuth,                    enrollCtrl.enroll);
router.put('/:id/enrollments/:uid',     requireAuth, requireInstructor, enrollCtrl.updateEnrollment);
router.delete('/:id/enrollments/:uid',  requireAuth, requireInstructor, enrollCtrl.unenroll);

// Content items (nested under module)
router.get('/:id/modules/:mid/content',       requireAuth,                    contentCtrl.list);
router.post('/:id/modules/:mid/content',      requireAuth, requireInstructor, auditLog('create', 'content_item'), contentCtrl.create);
router.put('/:id/modules/:mid/content/:cid',  requireAuth, requireInstructor, auditLog('update', 'content_item'), contentCtrl.update);
router.delete('/:id/modules/:mid/content/:cid', requireAuth, requireInstructor, auditLog('delete', 'content_item'), contentCtrl.remove);

// Assignments (nested under course)
router.get('/:id/assignments',              requireAuth,                    assignCtrl.listByCourse);
router.post('/:id/assignments',             requireAuth, requireInstructor, validate(createAssignmentSchema), auditLog('create', 'assignment'), assignCtrl.create);
router.get('/:id/assignments/:aid',         requireAuth,                    assignCtrl.getOne);
router.put('/:id/assignments/:aid',         requireAuth, requireInstructor, validate(updateAssignmentSchema), auditLog('update', 'assignment'), assignCtrl.update);
router.delete('/:id/assignments/:aid',      requireAuth, requireInstructor, auditLog('delete', 'assignment'), assignCtrl.remove);
router.get('/:id/assignments/:aid/grades',  requireAuth, requireInstructor, assignCtrl.getGrades);
router.put('/:id/assignments/:aid/grades/:uid', requireAuth, requireInstructor, validate(gradeSchema), assignCtrl.upsertGrade);

// Submissions (nested under assignment)
router.get('/:id/assignments/:aid/submissions',            requireAuth, requireInstructor, subCtrl.listByAssignment);
router.get('/:id/assignments/:aid/submissions/mine',       requireAuth,                    subCtrl.getMine);
router.post('/:id/assignments/:aid/submit',                requireAuth,                    subCtrl.submit);
router.put('/:id/assignments/:aid/submissions/:sid',       requireAuth, requireInstructor, subCtrl.updateStatus);
router.put('/:id/assignments/:aid/progress',               requireAuth,                    subCtrl.updateProgress);
router.get('/:id/assignments/:aid/progress',               requireAuth, requireInstructor, assignCtrl.getProgress);

// Assignment unlock/lock (per cohort)
router.post('/:id/assignments/:aid/unlock',  requireAuth, requireInstructor, validate(unlockSchema), auditLog('unlock', 'assignment'), assignCtrl.unlockForCohort);
router.post('/:id/assignments/:aid/lock',    requireAuth, requireInstructor, validate(unlockSchema), auditLog('lock',   'assignment'), assignCtrl.lockForCohort);

// Squad grading
router.put('/:id/assignments/:aid/grades/squad/:squadId', requireAuth, requireInstructor, validate(gradeSchema), assignCtrl.gradeSquad);

// Squads (nested under cohort)
router.get('/:id/cohorts/:cid/squads',                    requireAuth, requireInstructor, squadCtrl.listByCohort);
router.post('/:id/cohorts/:cid/squads',                   requireAuth, requireInstructor, squadCtrl.create);
router.put('/:id/cohorts/:cid/squads/:sid',               requireAuth, requireInstructor, squadCtrl.update);
router.delete('/:id/cohorts/:cid/squads/:sid',            requireAuth, requireInstructor, squadCtrl.remove);
router.post('/:id/cohorts/:cid/squads/:sid/members',      requireAuth, requireInstructor, squadCtrl.assignMember);
router.delete('/:id/cohorts/:cid/squads/:sid/members/:uid', requireAuth, requireInstructor, squadCtrl.removeMember);

// Cohorts (nested under course)
router.get('/:id/cohorts',                    requireAuth, requireInstructor, cohortCtrl.listByCourse);
router.post('/:id/cohorts',                   requireAuth, requireInstructor, auditLog('create', 'cohort'), cohortCtrl.create);
router.get('/:id/cohorts/:cid',               requireAuth, requireInstructor, cohortCtrl.getOne);
router.put('/:id/cohorts/:cid',               requireAuth, requireInstructor, auditLog('update', 'cohort'), cohortCtrl.update);
router.delete('/:id/cohorts/:cid',            requireAuth, requireInstructor, auditLog('delete', 'cohort'), cohortCtrl.remove);
router.post('/:id/cohorts/:cid/members',      requireAuth, requireInstructor, cohortCtrl.addMember);
router.delete('/:id/cohorts/:cid/members/:uid', requireAuth, requireInstructor, cohortCtrl.removeMember);

module.exports = router;
