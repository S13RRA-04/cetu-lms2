'use strict';
const lti    = require('ltijs').Provider;
const { User, Enrollment, Course, LtiToolRegistration } = require('../models');
const { AppError } = require('../utils/errors');
const logger       = require('../utils/logger');

// ── LTI Launch Handler ─────────────────────────────────────────────────────

async function handleLaunch(token, req, res) {
  try {
    const info = token.userInfo || {};

    const [user] = await User.upsert(
      {
        email:      info.email || `lti_${token.user}@lti.local`,
        username:   info.email || `lti_${token.user}`,
        first_name: info.given_name  || 'LTI',
        last_name:  info.family_name || 'User',
        role:       mapLtiRole(token.roles),
        is_active:  true,
      },
      { conflictFields: ['email'] }
    );

    // Auto-enroll based on context label matching a course_code
    const contextLabel = token.platformContext?.context?.label;
    if (contextLabel) {
      const course = await Course.findOne({ where: { course_code: contextLabel } });
      if (course) {
        await Enrollment.findOrCreate({
          where:    { user_id: user.id, course_id: course.id },
          defaults: { role: mapEnrollmentRole(token.roles), status: 'active', enrolled_at: new Date() },
        });
      }
    }

    logger.info('LTI launch handled', { userId: user.id, roles: token.roles });
    return lti.redirect(res, '/dashboard');
  } catch (err) {
    logger.error('LTI launch error', { error: err.message });
    return res.status(500).json({ error: 'LTI launch failed' });
  }
}

// ── Deep Linking Handler ───────────────────────────────────────────────────

async function handleDeepLinking(token, req, res) {
  // Return an empty form — the SPA will POST content selections back via this endpoint
  // In production, redirect to the SPA's deep-link picker with a signed token
  const items = req.body?.items || [];
  try {
    return lti.DeepLinking.sendDeepLinkingForm(token, res, { message: 'Content linked successfully', items });
  } catch (err) {
    logger.error('Deep linking error', { error: err.message });
    return res.status(500).json({ error: 'Deep linking failed' });
  }
}

// ── AGS: Publish Grade Asynchronously (no active session) ─────────────────

async function publishGradeAsync(assignment, userId, score) {
  if (!assignment.lineitem_url) {
    logger.warn('AGS skipped — no lineitem_url on assignment', { assignmentId: assignment.id });
    return;
  }

  try {
    const platform = await lti.getPlatformById(assignment.platform_id);
    if (!platform) return;

    const accessToken = await lti.getAccessToken(platform);

    const scorePayload = {
      userId,
      scoreGiven:       parseFloat(score),
      scoreMaximum:     parseFloat(assignment.max_score),
      activityProgress: 'Completed',
      gradingProgress:  'FullyGraded',
      timestamp:        new Date().toISOString(),
    };

    await lti.Grade.ScorePublishAsync(assignment.lineitem_url, scorePayload, accessToken);
    logger.info('AGS grade published (async)', { assignmentId: assignment.id, userId });
  } catch (err) {
    logger.error('AGS async publish failed', { error: err.message, assignmentId: assignment.id });
  }
}

// ── AGS: Publish Grade Within Active Session ───────────────────────────────

async function publishGradeInSession(res, userId, score, maxScore) {
  const scorePayload = {
    userId,
    scoreGiven:       parseFloat(score),
    scoreMaximum:     parseFloat(maxScore),
    activityProgress: 'Completed',
    gradingProgress:  'FullyGraded',
    timestamp:        new Date().toISOString(),
  };

  try {
    await lti.Grade.ScorePublish(res, scorePayload);
    logger.info('AGS grade published (session)', { userId });
  } catch (err) {
    logger.error('AGS session publish failed', { error: err.message });
    throw new AppError('Grade passback failed', 502, 'AGS_FAILED');
  }
}

// ── NRPS: Get Course Roster ────────────────────────────────────────────────

async function getCourseRoster(res) {
  try {
    return await lti.NamesAndRoles.getMembers(res);
  } catch (err) {
    logger.error('NRPS fetch failed', { error: err.message });
    throw new AppError('Roster fetch failed', 502, 'NRPS_FAILED');
  }
}

// ── Platform Registration ──────────────────────────────────────────────────

async function registerPlatform(data) {
  // Register in ltijs
  const platform = await lti.registerPlatform({
    url:                     data.platform_url,
    name:                    data.name,
    clientId:                data.client_id,
    authenticationEndpoint:  data.auth_endpoint,
    accesstokenEndpoint:     data.token_endpoint,
    authConfig: { method: 'JWK_SET', key: data.jwks_endpoint },
  });

  // Mirror in our app DB for UI management
  return LtiToolRegistration.create({
    name:           data.name,
    client_id:      data.client_id,
    platform_url:   data.platform_url,
    auth_endpoint:  data.auth_endpoint,
    token_endpoint: data.token_endpoint,
    jwks_endpoint:  data.jwks_endpoint,
    deployment_ids: data.deployment_ids || [],
    is_active:      true,
  });
}

async function deactivatePlatform(id) {
  const reg = await LtiToolRegistration.findByPk(id);
  if (!reg) throw new AppError('Registration not found', 404, 'NOT_FOUND');

  await lti.deletePlatformById(reg.client_id).catch(() => {});
  return reg.update({ is_active: false });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapLtiRole(roles = []) {
  if (roles.some((r) => r.includes('Administrator'))) return 'admin';
  if (roles.some((r) => r.includes('Instructor')))    return 'instructor';
  return 'student';
}

function mapEnrollmentRole(roles = []) {
  if (roles.some((r) => r.includes('Instructor'))) return 'instructor';
  if (roles.some((r) => r.includes('TeachingAssistant'))) return 'ta';
  return 'student';
}

module.exports = {
  handleLaunch,
  handleDeepLinking,
  publishGradeAsync,
  publishGradeInSession,
  getCourseRoster,
  registerPlatform,
  deactivatePlatform,
};
