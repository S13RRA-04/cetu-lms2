'use strict';
const { Router }         = require('express');
const authController     = require('../controllers/auth.controller');
const { validate }       = require('../middleware/validate');
const { authLimiter }    = require('../middleware/rateLimiter');
const { requireAuth }    = require('../middleware/auth');
const { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordWithTokenSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/login',                  authLimiter, validate(loginSchema),    authController.login);
router.post('/register',               authLimiter, validate(registerSchema), authController.register);
router.post('/refresh',                authLimiter, authController.refresh);
router.post('/logout',                              authController.logout);
router.post('/launch-token',           requireAuth, authController.issueLaunchToken);
router.post('/exchange-launch-token',  authLimiter, authController.exchangeLaunchToken);
router.post('/forgot-password',        authLimiter, validate(forgotPasswordSchema),        authController.forgotPassword);
router.post('/reset-password',         authLimiter, validate(resetPasswordWithTokenSchema), authController.resetPassword);

module.exports = router;
