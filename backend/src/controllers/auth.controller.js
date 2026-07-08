'use strict';
const crypto      = require('crypto');
const authService = require('../services/auth.service');
const logger      = require('../utils/logger');

/* ── Launch tokens ───────────────────────────────────────────────────────────
   Short-lived (60 s), single-use tokens that let an LMS-authenticated user
   start a PACT session without re-entering credentials.
   Stored in memory — intentionally ephemeral, lost on restart.
─────────────────────────────────────────────────────────────────────────── */
const LAUNCH_TOKENS   = new Map(); // token → { userId, expiresAt }
const LAUNCH_TTL_MS   = 60_000;   // 60 seconds
const PACT_URL        = (process.env.PACT_URL ?? 'https://pact.cetu.online').replace(/\/$/, '');
const LAIR_URL        = (process.env.LAIR_URL ?? 'https://lair.cetu.online').replace(/\/$/, '');

/* Prune expired tokens lazily on each issuance */
function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of LAUNCH_TOKENS) if (v.expiresAt < now) LAUNCH_TOKENS.delete(k);
}

const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  secure:    process.env.NODE_ENV === 'production',
  // Shared across pact/lair/kcr subdomains + the LMS apex so a session started
  // on one app can be silently resumed on another via the refresh cookie.
  domain:    process.env.NODE_ENV === 'production' ? '.cetu.online' : undefined,
  maxAge:    7 * 24 * 60 * 60 * 1000,
  path:      '/',
};

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(email, password);

    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);
    return res.status(200).json({
      accessToken,
      user: {
        id:                  user.id,
        email:               user.email,
        username:            user.username,
        first_name:          user.first_name,
        last_name:           user.last_name,
        role:                user.role,
        onboarding_complete: user.onboarding_complete,
        professional_role:   user.professional_role,
        certifications:      user.certifications,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const raw = req.cookies?.refresh_token;
    if (!raw) {
      const { AppError } = require('../utils/errors');
      return next(new AppError('No refresh token provided', 401, 'MISSING_TOKEN'));
    }

    const { accessToken, refreshToken, user } = await authService.rotateRefreshToken(raw);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);

    return res.status(200).json({
      accessToken,
      user: {
        id:                  user.id,
        email:               user.email,
        username:            user.username,
        first_name:          user.first_name,
        last_name:           user.last_name,
        role:                user.role,
        onboarding_complete: user.onboarding_complete,
        professional_role:   user.professional_role,
        certifications:      user.certifications,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const raw = req.cookies?.refresh_token;
    if (raw) await authService.logout(raw);

    res.clearCookie('refresh_token', { path: '/', domain: COOKIE_OPTS.domain });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
}

async function register(req, res, next) {
  try {
    const { createUser } = require('../services/user.service');
    const user = await createUser({ ...req.body, role: 'student', is_active: false });
    return res.status(201).json({
      message: 'Registration successful. Your account is pending admin approval before you can log in.',
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /auth/launch-token  (requires LMS session)
   Body: { target: 'pact' | 'lair' }  — defaults to 'pact' */
async function issueLaunchToken(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    pruneExpired();
    const token = crypto.randomBytes(32).toString('hex');
    LAUNCH_TOKENS.set(token, { userId: req.user.id, expiresAt: Date.now() + LAUNCH_TTL_MS });
    const baseUrl = req.body?.target === 'lair' ? LAIR_URL : PACT_URL;
    return res.json({ launchUrl: `${baseUrl}/?launch_token=${token}` });
  } catch (err) { return next(err); }
}

/* POST /auth/exchange-launch-token  { token }  (public — no prior session needed) */
async function exchangeLaunchToken(req, res, next) {
  try {
    const { token } = req.body ?? {};
    const entry = token && LAUNCH_TOKENS.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(401).json({ error: { message: 'Invalid or expired launch token' } });
    }
    LAUNCH_TOKENS.delete(token); // single-use

    const { User } = require('../models');
    const user = await User.findByPk(entry.userId);
    if (!user || !user.is_active) return res.status(401).json({ error: { message: 'User not found or inactive' } });

    const accessToken = authService.generateAccessToken(user);
    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
    });
  } catch (err) { return next(err); }
}

module.exports = { login, register, refresh, logout, issueLaunchToken, exchangeLaunchToken };
