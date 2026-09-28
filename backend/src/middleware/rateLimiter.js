'use strict';
const rateLimit = require('express-rate-limit');
const jwt       = require('jsonwebtoken');

// express-rate-limit's default key is req.ip — fine for a client scattered
// across the internet, but this app is used by an entire in-person
// classroom (30+ students, one training-facility NAT/gateway) sharing ONE
// public IP. That bucketed the whole room as a single client. The September
// cohort's post-course survey named this directly: "Fixing what the issue
// was behind us not being able to log in initially...if a lot of us were
// logging in on the same time" and "expand server capacity so we don't get
// booted with a 'too many requests' error." Where a request carries a valid
// access token, key on the student instead so each of them gets their own
// budget; this is a best-effort decode purely for bucketing; anything that
// fails to verify (missing/expired/malformed token, e.g. every pre-login
// request) just falls back to req.ip exactly as before.
function rateLimitKey(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'cetu-lms' });
      if (payload?.sub) return `user:${payload.sub}`;
    } catch { /* fall through to IP */ }
  }
  return req.ip;
}

const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  // Was 20 — shared by every student behind one classroom IP, across
  // login/register/exchange-launch-token/forgot-password/reset-password
  // combined. Raised for classroom-realistic headroom; still IP-keyed since
  // there's no token to key on before login succeeds.
  max:              120,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

// /auth/refresh is routine, automatic, expected traffic from every already-
// logged-in student roughly every 15 minutes (an access-token lifetime) —
// not a credential-guessing vector, since it requires already holding a
// valid signed cookie. It previously shared authLimiter's login/register
// budget, so ordinary background refreshes across a full classroom could
// exhaust the same bucket real login attempts needed.
const refreshLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              600,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

const apiLimiter = rateLimit({
  windowMs:         60 * 1000,
  // Was 200/min shared per IP — same classroom-NAT problem as authLimiter,
  // compounded because this one covers ALL authenticated API traffic
  // (autosave, live progress, squad state polling, etc.) for everyone in
  // the room at once. Now keyed per-student where a token is present, with
  // the per-key budget raised too since a single active student's own
  // legitimate traffic already runs well past the old shared 200.
  max:              300,
  keyGenerator:     rateLimitKey,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: { message: 'Too many requests.', code: 'RATE_LIMITED' } },
});

module.exports = { authLimiter, refreshLimiter, apiLimiter };
