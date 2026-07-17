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

/* Allow access if the requesting user is the target OR has management-level role
   (admin, superadmin, or instructor / Program Manager). */
const requireSelfOrAdmin = (paramName = 'id') => (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  const isSelf    = req.user.id === req.params[paramName];
  const isManager = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.INSTRUCTOR].includes(req.user.role);
  if (!isSelf && !isManager) return next(new ForbiddenError());
  return next();
};

/* Guards role/is_active changes on the user-update routes specifically.
   requireSelfOrAdmin() lets a user edit their OWN record (for name/
   professional_role/certifications) and lets an instructor edit ANYONE's
   record — neither of those should extend to granting roles or reactivating/
   deactivating accounts. Only admin/superadmin may touch these two fields,
   on any target including their own. Must run after body-parsing but before
   the Joi validate() call still strips these two fields for self-service
   (see updateSelfSchema) — this is the guard for the shared PUT /:id route,
   where the schema alone can't distinguish "editing self" from "editing
   someone else" the way the route's two schemas do. */
const restrictPrivilegedUserFields = (...fields) => (req, res, next) => {
  const attemptsPrivilegedChange = fields.some((f) => Object.hasOwn(req.body ?? {}, f));
  if (attemptsPrivilegedChange && ![ROLES.ADMIN, ROLES.SUPERADMIN].includes(req.user?.role)) {
    return next(new ForbiddenError(`Only admins can change: ${fields.join(', ')}`));
  }
  return next();
};

module.exports = { requireAuth, requireRole, requireAdmin, requireInstructor, requireSelfOrAdmin, restrictPrivilegedUserFields };
