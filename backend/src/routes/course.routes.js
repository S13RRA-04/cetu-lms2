'use strict';
const { Router }   = require('express');
const ctrl         = require('../controllers/course.controller');
const enrollCtrl   = require('../controllers/enrollment.controller');
const assignCtrl   = require('../controllers/assignment.controller');
const contentCtrl  = require('../controllers/contentItem.controller');
const subCtrl      = require('../controllers/submission.controller');
const cohortCtrl   = require('../controllers/cohort.controller');
const squadCtrl        = require('../controllers/squad.controller');
const campaignCtrl     = require('../controllers/campaign.controller');
const campaignPuzzleCtrl = require('../controllers/campaignPuzzle.controller');
const scenarioCtrl     = require('../controllers/scenario.controller');
const courseContentCtrl = require('../controllers/courseContent.controller');
const intelCtrl        = require('../controllers/intel.controller');
const chatCtrl         = require('../controllers/chat.controller');
const squadStateCtrl   = require('../controllers/squadChallengeState.controller');
const preRangeBriefingCtrl = require('../controllers/preRangeBriefing.controller');
const { requireAuth, requireInstructor, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const {
  createCourseSchema, updateCourseSchema,
  createModuleSchema, updateModuleSchema,
} = require('../validators/course.validator');
const { createAssignmentSchema, updateAssignmentSchema, gradeSchema, unlockSchema } = require('../validators/assignment.validator');
const { createCampaignDropSchema, updateCampaignDropSchema, verifyVaultPinSchema, lockCampaignDropSchema, releasePreviewSchema } = require('../validators/campaign.validator');
const { createPuzzleSchema, updatePuzzleSchema, verifyPuzzleSchema, reorderPuzzlesSchema } = require('../validators/campaignPuzzle.validator');
const { syncDropCaseFilesSchema } = require('../validators/courseContent.validator');

const router = Router();

// Program overview (admin + instructors)
router.get('/program-overview', requireAuth, requireInstructor, ctrl.getProgramOverview);

// Courses
router.get('/',    requireAuth,                    ctrl.list);
router.post('/',   requireAuth, requireInstructor, validate(createCourseSchema), auditLog('create', 'course'), ctrl.create);
router.get('/:id', requireAuth,                    ctrl.getOne);
router.put('/:id', requireAuth, requireInstructor, validate(updateCourseSchema), auditLog('update', 'course'), ctrl.update);
router.delete('/:id', requireAuth, requireInstructor, auditLog('delete', 'course'), ctrl.remove);

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

// Chat (Stream) — mint a user token scoped to the caller's squad/cohort channels
router.get('/:id/chat/token',           requireAuth,                    chatCtrl.getToken);
router.get('/:id/chat/users',           requireAuth,                    chatCtrl.listUsers);
router.post('/:id/chat/dm',             requireAuth,                    chatCtrl.startDM);

// Content items (nested under module)
router.get('/:id/modules/:mid/content',       requireAuth,                    contentCtrl.list);
router.post('/:id/modules/:mid/content',      requireAuth, requireInstructor, auditLog('create', 'content_item'), contentCtrl.create);
router.put('/:id/modules/:mid/content/:cid',  requireAuth, requireInstructor, auditLog('update', 'content_item'), contentCtrl.update);
router.delete('/:id/modules/:mid/content/:cid', requireAuth, requireInstructor, auditLog('delete', 'content_item'), contentCtrl.remove);

// Student grade summary + scoreboard
router.get('/:id/grades/me',  requireAuth,                    assignCtrl.getMyGrades);
router.get('/:id/grades',     requireAuth, requireInstructor, assignCtrl.getCourseGrades);
router.get('/:id/analytics',     requireAuth, requireInstructor, assignCtrl.getCourseAnalytics);
router.get('/:id/effectiveness', requireAuth, requireInstructor, assignCtrl.getCourseEffectiveness);
router.get('/:id/scoreboard',       requireAuth, assignCtrl.getScoreboard);
router.get('/:id/squad-scoreboard', requireAuth, assignCtrl.getSquadScoreboard);

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
router.get('/:id/live-progress',                            requireAuth, requireInstructor, assignCtrl.getLiveOverview);

// Squad-shared challenge state (question progress/answers/hints shared across a squad)
router.get('/:id/assignments/:aid/squad-state', requireAuth, squadStateCtrl.getState);
router.put('/:id/assignments/:aid/squad-state', requireAuth, squadStateCtrl.saveState);

// Assignment unlock/lock (per cohort)
router.post('/:id/assignments/:aid/unlock',  requireAuth, requireInstructor, validate(unlockSchema), auditLog('unlock', 'assignment'), assignCtrl.unlockForCohort);
router.post('/:id/assignments/:aid/lock',    requireAuth, requireInstructor, validate(unlockSchema), auditLog('lock',   'assignment'), assignCtrl.lockForCohort);

// Squad grading
router.put('/:id/assignments/:aid/grades/squad/:squadId', requireAuth, requireInstructor, validate(gradeSchema), assignCtrl.gradeSquad);

// Squads (nested under cohort)
router.get('/:id/cohorts/:cid/squads',                     requireAuth, requireInstructor, squadCtrl.listByCohort);
router.post('/:id/cohorts/:cid/squads',                    requireAuth, requireInstructor, squadCtrl.create);
router.put('/:id/cohorts/:cid/squads/:sid',                requireAuth, requireInstructor, squadCtrl.update);
router.delete('/:id/cohorts/:cid/squads/:sid',             requireAuth, requireInstructor, squadCtrl.remove);
router.post('/:id/cohorts/:cid/squads/:sid/members',       requireAuth, requireInstructor, squadCtrl.assignMember);
router.delete('/:id/cohorts/:cid/squads/:sid/members/:uid', requireAuth, requireInstructor, squadCtrl.removeMember);

// Cohorts (nested under course)
router.get('/:id/cohorts',                    requireAuth, requireInstructor, cohortCtrl.listByCourse);
router.post('/:id/cohorts',                   requireAuth, requireInstructor, auditLog('create', 'cohort'), cohortCtrl.create);
router.get('/:id/cohorts/:cid',               requireAuth, requireInstructor, cohortCtrl.getOne);
router.put('/:id/cohorts/:cid',               requireAuth, requireInstructor, auditLog('update', 'cohort'), cohortCtrl.update);
router.delete('/:id/cohorts/:cid',            requireAuth, requireInstructor, auditLog('delete', 'cohort'), cohortCtrl.remove);
router.post('/:id/cohorts/:cid/members',      requireAuth, requireInstructor, cohortCtrl.addMember);
router.post('/:id/cohorts/:cid/members/bulk', requireAuth, requireInstructor, cohortCtrl.addMembers);
router.delete('/:id/cohorts/:cid/members/:uid', requireAuth, requireInstructor, cohortCtrl.removeMember);

// Cohort-scoped KCR pre-range briefing. Students receive content only after release.
router.get('/:id/cohorts/:cid/pre-range-briefing', requireAuth, preRangeBriefingCtrl.get);
router.post('/:id/cohorts/:cid/pre-range-briefing/release', requireAuth, requireInstructor, auditLog('release', 'pre_range_briefing'), preRangeBriefingCtrl.release);
router.post('/:id/cohorts/:cid/pre-range-briefing/lock', requireAuth, requireInstructor, auditLog('lock', 'pre_range_briefing'), preRangeBriefingCtrl.lock);

// Scenario packages
router.get('/:id/scenarios',                       requireAuth,                    scenarioCtrl.list);
router.post('/:id/scenarios',                      requireAuth, requireInstructor, scenarioCtrl.create);
// R2 browser + upload + quick-release (must precede /:sid param routes)
router.get('/:id/scenarios/browse',                requireAuth, requireInstructor, scenarioCtrl.browse);
router.post('/:id/scenarios/presign',              requireAuth, requireInstructor, scenarioCtrl.presignUpload);
router.delete('/:id/scenarios/r2-object',          requireAuth, requireInstructor, scenarioCtrl.deleteR2Object);
router.post('/:id/scenarios/quick-release',        requireAuth, requireInstructor, scenarioCtrl.quickRelease);
// Per-package routes
router.put('/:id/scenarios/:sid',                  requireAuth, requireInstructor, scenarioCtrl.update);
router.delete('/:id/scenarios/:sid',               requireAuth, requireInstructor, scenarioCtrl.remove);
router.get('/:id/scenarios/:sid/download',         requireAuth,                    scenarioCtrl.getDownloadUrl);
router.get('/:id/scenarios/:sid/download-all',      requireAuth,                    scenarioCtrl.downloadAllZip);
router.post('/:id/scenarios/:sid/unlock',          requireAuth, requireInstructor, scenarioCtrl.unlockForCohort);
router.post('/:id/scenarios/:sid/lock',            requireAuth, requireInstructor, scenarioCtrl.lockForCohort);

// Course content items (slides, handouts, agendas, forms)
const rawUpload = require('express').raw({ type: '*/*', limit: '20mb' });
router.get('/:id/course-content',           requireAuth,                    courseContentCtrl.list);
router.post('/:id/course-content',          requireAuth, requireInstructor, courseContentCtrl.create);
router.post('/:id/course-content/sync-decks', requireAuth, requireInstructor, courseContentCtrl.syncDecks);
router.post('/:id/course-content/sync-drop-files', requireAuth, requireInstructor, validate(syncDropCaseFilesSchema), auditLog('sync', 'course_content'), courseContentCtrl.syncDropCaseFiles);
router.post('/:id/course-content/upload',   requireAuth, requireInstructor, rawUpload, courseContentCtrl.create);
router.put('/:id/course-content/:cid',      requireAuth, requireInstructor, courseContentCtrl.update);
router.delete('/:id/course-content/:cid',   requireAuth, requireInstructor, courseContentCtrl.remove);
router.get('/:id/course-content/:cid/download', requireAuth,                    courseContentCtrl.download);
router.post('/:id/course-content/:cid/unlock',  requireAuth, requireInstructor, courseContentCtrl.unlockForCohort);
router.post('/:id/course-content/:cid/lock',    requireAuth, requireInstructor, courseContentCtrl.lockForCohort);

// Campaign drops
router.get('/:id/campaign/puzzle-presets',       requireAuth, requireInstructor, campaignPuzzleCtrl.listPresets);
router.get('/:id/campaign/drops',              requireAuth,                    campaignCtrl.listDrops);
router.post('/:id/campaign/drops',             requireAuth, requireInstructor, validate(createCampaignDropSchema), campaignCtrl.createDrop);
router.put('/:id/campaign/drops/:did',         requireAuth, requireInstructor, validate(updateCampaignDropSchema), campaignCtrl.updateDrop);
router.delete('/:id/campaign/drops/:did',      requireAuth, requireInstructor, campaignCtrl.deleteDrop);
router.get('/:id/campaign/drops/:did/release-preview', requireAuth, requireInstructor, validate(releasePreviewSchema, 'query'), campaignCtrl.previewRelease);
router.post('/:id/campaign/drops/:did/release',  requireAuth, requireInstructor, campaignCtrl.releaseDrop);
router.post('/:id/campaign/drops/:did/lock',     requireAuth, requireInstructor, validate(lockCampaignDropSchema), campaignCtrl.lockDrop);
router.post('/:id/campaign/drops/:did/verify-pin', requireAuth, validate(verifyVaultPinSchema), campaignCtrl.verifyVaultPin);
router.get('/:id/campaign/drops/:did/puzzles',            requireAuth, requireInstructor, campaignPuzzleCtrl.listPuzzles);
router.get('/:id/campaign/drops/:did/puzzle-completion',  requireAuth,                    campaignPuzzleCtrl.getCompletion);
router.post('/:id/campaign/drops/:did/puzzles',            requireAuth, requireInstructor, validate(createPuzzleSchema), campaignPuzzleCtrl.createPuzzle);
router.post('/:id/campaign/drops/:did/puzzles/reorder',    requireAuth, requireInstructor, validate(reorderPuzzlesSchema), campaignPuzzleCtrl.reorderPuzzles);
router.put('/:id/campaign/drops/:did/puzzles/:puzzleId',   requireAuth, requireInstructor, validate(updatePuzzleSchema), campaignPuzzleCtrl.updatePuzzle);
router.delete('/:id/campaign/drops/:did/puzzles/:puzzleId', requireAuth, requireInstructor, campaignPuzzleCtrl.deletePuzzle);
router.post('/:id/campaign/drops/:did/puzzles/:puzzleId/verify', requireAuth, validate(verifyPuzzleSchema), campaignPuzzleCtrl.verifyPuzzle);

// Intel board (per-squad link analysis)
router.get('/:id/intel',                requireAuth,                    intelCtrl.getBoard);
router.put('/:id/intel',                requireAuth,                    intelCtrl.saveBoard);
router.get('/:id/intel/squad/:squadId', requireAuth, requireInstructor, intelCtrl.getSquadBoard);

module.exports = router;
