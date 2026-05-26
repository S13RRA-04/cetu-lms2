'use strict';
const { Router }   = require('express');
const ctrl         = require('../controllers/lti.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = Router();

// Platform (tool) registration management — admin only
router.get('/',         requireAuth, requireAdmin, ctrl.listPlatforms);
router.post('/',        requireAuth, requireAdmin, auditLog('create', 'lti_platform'), ctrl.createPlatform);
router.put('/:id',      requireAuth, requireAdmin, auditLog('update', 'lti_platform'), ctrl.updatePlatform);
router.delete('/:id',   requireAuth, requireAdmin, auditLog('delete', 'lti_platform'), ctrl.deletePlatform);

module.exports = router;
