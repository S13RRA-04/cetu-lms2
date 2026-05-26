'use strict';
const authService = require('../services/auth.service');
const logger      = require('../utils/logger');

const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  secure:    process.env.NODE_ENV === 'production',
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
        id:         user.id,
        email:      user.email,
        username:   user.username,
        first_name: user.first_name,
        last_name:  user.last_name,
        role:       user.role,
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
        id:         user.id,
        email:      user.email,
        username:   user.username,
        first_name: user.first_name,
        last_name:  user.last_name,
        role:       user.role,
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

    res.clearCookie('refresh_token', { path: '/' });
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

module.exports = { login, register, refresh, logout };
