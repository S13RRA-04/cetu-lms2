'use strict';
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, RefreshToken, PasswordResetToken } = require('../models');
const { AppError }           = require('../utils/errors');
const logger                 = require('../utils/logger');

const ACCESS_EXPIRY         = '15m';
const REFRESH_EXPIRY_MS     = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS    = 30 * 60 * 1000; // 30 minutes

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY, issuer: 'cetu-lms' }
  );
}

async function generateRefreshToken(user) {
  const raw  = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  await RefreshToken.create({
    user_id:    user.id,
    token_hash: hash,
    expires_at: new Date(Date.now() + REFRESH_EXPIRY_MS),
    revoked:    false,
  });

  return raw;
}

async function validateRefreshToken(raw) {
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const record = await RefreshToken.findOne({
    where: { token_hash: hash, revoked: false },
    include: [{ model: User.unscoped() }],
  });

  if (!record || record.expires_at < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
  }

  return record;
}

async function rotateRefreshToken(raw) {
  const record = await validateRefreshToken(raw);
  await record.update({ revoked: true });

  const user         = record.User;
  const accessToken  = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { accessToken, refreshToken, user };
}

async function login(email, password) {
  const user = await User.unscoped().findOne({ where: { email } });
  if (!user || !user.password_hash) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  if (!user.is_active) throw new AppError('Account is deactivated', 403, 'DEACTIVATED');

  await user.update({ last_login: new Date() });

  const accessToken  = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return { accessToken, refreshToken, user };
}

async function logout(raw) {
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  await RefreshToken.update({ revoked: true }, { where: { token_hash: hash } });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  if (user.password_hash) {
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash: hash });

  // Revoke all existing refresh tokens for security
  await RefreshToken.update({ revoked: true }, { where: { user_id: userId } });
}

/* Admin-initiated reset — skips the current-password check in changePassword()
   since the admin resetting someone else's password doesn't know it. */
async function adminResetPassword(userId, newPassword) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const hash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash: hash });

  // Revoke all existing refresh tokens for security
  await RefreshToken.update({ revoked: true }, { where: { user_id: userId } });
}

/* Self-service forgot-password: always resolves the same way whether or not
   the email matches a user — the controller must not be able to tell the
   difference, or this becomes a user-enumeration vector. */
async function requestPasswordReset(email) {
  const user = await User.unscoped().findOne({ where: { email } });
  if (!user || !user.is_active) return;

  const raw  = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  await PasswordResetToken.create({
    user_id:    user.id,
    token_hash: hash,
    expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    used:       false,
  });

  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${base}/reset-password?token=${raw}`;

  try {
    const mailService = require('./mail.service');
    await mailService.sendPasswordResetEmail(user, resetUrl);
  } catch (err) {
    // Don't leak send failures to the caller — same generic response either way.
    logger.error('Failed to send password reset email', { error: err.message, userId: user.id });
  }
}

async function resetPasswordWithToken(rawToken, newPassword) {
  const hash   = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = await PasswordResetToken.findOne({ where: { token_hash: hash, used: false } });

  if (!record || record.expires_at < new Date()) {
    throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');
  }

  const user = await User.scope('withPassword').findByPk(record.user_id);
  if (!user) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash: passwordHash });
  await record.update({ used: true });

  // Revoke all existing refresh tokens for security
  await RefreshToken.update({ revoked: true }, { where: { user_id: user.id } });
}

module.exports = {
  login, logout, generateAccessToken, generateRefreshToken, rotateRefreshToken,
  changePassword, adminResetPassword, requestPasswordReset, resetPasswordWithToken,
};
