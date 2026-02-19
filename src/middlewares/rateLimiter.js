const rateLimit = require('express-rate-limit');

const createUserRateLimiter = (maxRequests, windowMinutes = 1) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => req.user ? req.user._id.toString() : req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  });
};

const measurementPostLimiter = createUserRateLimiter(
  parseInt(process.env.RATE_LIMIT_MEASUREMENTS_POST || '100')
);

const measurementBatchLimiter = createUserRateLimiter(
  parseInt(process.env.RATE_LIMIT_MEASUREMENTS_BATCH || '10')
);

const measurementDeleteLimiter = createUserRateLimiter(
  parseInt(process.env.RATE_LIMIT_MEASUREMENTS_DELETE || '5')
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts. Please try again later.' }
});

module.exports = {
  measurementPostLimiter,
  measurementBatchLimiter,
  measurementDeleteLimiter,
  loginLimiter,
  refreshLimiter
};
