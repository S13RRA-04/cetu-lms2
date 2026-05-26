'use strict';
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

const apiLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: { message: 'Too many requests.', code: 'RATE_LIMITED' } },
});

module.exports = { authLimiter, apiLimiter };
