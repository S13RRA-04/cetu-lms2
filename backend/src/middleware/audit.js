'use strict';
const logger = require('../utils/logger');

const auditLog = (action, resourceType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode < 400 && req.user) {
      try {
        const { AuditLog } = require('../models');
        await AuditLog.create({
          user_id:       req.user.id,
          action,
          resource_type: resourceType,
          resource_id:   body?.id || req.params?.id || null,
          metadata:      { method: req.method, path: req.path, body: sanitize(req.body) },
          ip_address:    req.ip,
        });
      } catch (err) {
        logger.error('Audit log write failed', { error: err.message });
      }
    }
    return originalJson(body);
  };

  next();
};

function sanitize(body) {
  if (!body) return null;
  const { password, password_hash, token, ...safe } = body;
  return safe;
}

module.exports = { auditLog };
