'use strict';
const { Router }         = require('express');
const authController     = require('../controllers/auth.controller');
const { validate }       = require('../middleware/validate');
const { authLimiter }    = require('../middleware/rateLimiter');
const { loginSchema, registerSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/login',    authLimiter, validate(loginSchema),    authController.login);
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/refresh',  authLimiter, authController.refresh);
router.post('/logout',               authController.logout);

module.exports = router;
