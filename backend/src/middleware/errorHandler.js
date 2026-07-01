'use strict';
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  if (err.isOperational) {
    logger.warn('Operational error', { message: err.message, statusCode: err.statusCode, path: req.path });
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code:    err.code,
        ...(err.details && { details: err.details }),
      },
    });
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
    return res.status(422).json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details } });
  }

  if (err.name === 'SequelizeDatabaseError') {
    const dbMsg = err.parent?.message ?? err.message;
    logger.error('Database error', { error: dbMsg, sql: err.sql, path: req.path });
    return res.status(500).json({ error: { message: dbMsg, code: 'DATABASE_ERROR' } });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' } });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
};
