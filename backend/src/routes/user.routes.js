'use strict';
const { Router }    = require('express');
const ctrl          = require('../controllers/user.controller');
const gradeService  = require('../services/grade.service');
const { requireAuth, requireAdmin, requireInstructor, requireSelfOrAdmin } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { auditLog }  = require('../middleware/audit');
const { createUserSchema, updateUserSchema, changePasswordSchema } = require('../validators/user.validator');

const router = Router();

// Self-service routes (must come before /:id)
router.get('/me', requireAuth, (req, res, next) => {
  const { password_hash, ...user } = req.user.toJSON ? req.user.toJSON() : req.user;
  return res.json(user);
});
router.put('/me', requireAuth, validate(updateUserSchema), auditLog('update', 'user'), async (req, res, next) => {
  try {
    const { userService } = require('../services/user.service');
    const updated = await require('../services/user.service').updateUser(req.user.id, req.body);
    return res.json(updated);
  } catch (err) { return next(err); }
});
router.put('/me/password', requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await require('../services/auth.service').changePassword(req.user.id, current_password, new_password);
    return res.json({ message: 'Password updated' });
  } catch (err) { return next(err); }
});
router.get('/me/grades', requireAuth, async (req, res, next) => {
  try { return res.json(await gradeService.getGradesForUser(req.user.id)); }
  catch (err) { return next(err); }
});

router.get('/',    requireAuth, requireInstructor, ctrl.list);
router.post('/',   requireAuth, requireInstructor, validate(createUserSchema), auditLog('create', 'user'), ctrl.create);

router.get('/:id',    requireAuth, requireSelfOrAdmin(), ctrl.getOne);
router.put('/:id',    requireAuth, requireSelfOrAdmin(), validate(updateUserSchema),    auditLog('update', 'user'), ctrl.update);
router.delete('/:id', requireAuth, requireInstructor,    auditLog('delete', 'user'),    ctrl.remove);

router.put('/:id/password', requireAuth, requireSelfOrAdmin(), validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
