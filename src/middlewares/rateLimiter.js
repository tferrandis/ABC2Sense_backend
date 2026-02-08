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

module.exports = {
  measurementPostLimiter,
  measurementBatchLimiter,
  measurementDeleteLimiter
};
