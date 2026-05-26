'use strict';
const passport = require('passport');
const { AppError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../config/constants');

const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new AppError(info?.message || 'Unauthorized', 401, 'UNAUTHORIZED'));
    if (!user.is_active) return next(new AppError('Account is deactivated', 403, 'DEACTIVATED'));
    req.user = user;
    return next();
  })(req, res, next);
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  if (!roles.includes(req.user.role)) return next(new ForbiddenError());
  return next();
};

const requireAdmin      = requireRole(ROLES.ADMIN, ROLES.SUPERADMIN);
const requireInstructor = requireRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.INSTRUCTOR);

// Allow access if user is the target user OR has admin/superadmin role
const requireSelfOrAdmin = (paramName = 'id') => (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  const isSelf  = req.user.id === req.params[paramName];
  const isAdmin = [ROLES.ADMIN, ROLES.SUPERADMIN].includes(req.user.role);
  if (!isSelf && !isAdmin) return next(new ForbiddenError());
  return next();
};

module.exports = { requireAuth, requireRole, requireAdmin, requireInstructor, requireSelfOrAdmin };
