const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMinutes, limit, message, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });

// A general limit for the whole API
const apiLimiter = createLimiter({
  windowMinutes: 15,
  limit: 1000,
  message: 'Too many requests. Please slow down and try again later.',
});

// Failed logins only: a correct login is not counted
const loginLimiter = createLimiter({
  windowMinutes: 15,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const registerLimiter = createLimiter({
  windowMinutes: 60,
  limit: 10,
  message: 'Too many accounts were created from this address. Please try again later.',
});

const forgotPasswordLimiter = createLimiter({
  windowMinutes: 60,
  limit: 5,
  message: 'Too many password reset requests. Please try again in an hour.',
});

const resetPasswordLimiter = createLimiter({
  windowMinutes: 60,
  limit: 10,
  message: 'Too many reset attempts. Please try again in an hour.',
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};