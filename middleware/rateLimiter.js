const rateLimit = require('express-rate-limit');
const redisCache = require('../utils/redisCache');
const Logger = require('../utils/logger');

const logger = new Logger('RATE_LIMITER');

/**
 * Create rate limiter with Redis store if available
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
    handler = (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  } = options;

  // Use Redis store if available
  if (redisCache.isConnected) {
    return rateLimit({
      windowMs,
      max,
      message,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler,
      store: {
        async increment(key) {
          const count = await redisCache.incr(`ratelimit:${key}`, Math.ceil(windowMs / 1000));
          return {
            totalHits: count,
            resetTime: new Date(Date.now() + windowMs)
          };
        },
        async decrement(key) {
          // Not implemented for Redis
        },
        async resetKey(key) {
          await redisCache.del(`ratelimit:${key}`);
        }
      }
    });
  }

  // Fallback to memory store
  logger.warn('Using in-memory rate limiter (Redis not available)');
  return rateLimit({
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler
  });
}

/**
 * General API rate limiter
 */
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many requests to this endpoint, please try again later.'
});

/**
 * AI endpoint rate limiter
 */
const aiLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many AI requests, please try again later.',
  skipSuccessfulRequests: false
});

/**
 * Authentication rate limiter
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

/**
 * File upload rate limiter
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many file uploads, please try again later.'
});

/**
 * Export rate limiter
 */
const exportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many export requests, please try again later.'
});

/**
 * Custom rate limiter by user ID
 */
function createUserRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      return req.user?._id?.toString() || req.ip;
    }
  });
}

/**
 * Adaptive rate limiter based on server load
 */
function createAdaptiveRateLimiter(baseOptions = {}) {
  let currentMax = baseOptions.max || 100;
  
  // Monitor server load and adjust limits
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memPercent > 90) {
      currentMax = Math.max(10, Math.floor(currentMax * 0.5));
      logger.warn('High memory usage, reducing rate limit', { 
        memPercent: memPercent.toFixed(2),
        newMax: currentMax 
      });
    } else if (memPercent < 50 && currentMax < baseOptions.max) {
      currentMax = Math.min(baseOptions.max, Math.floor(currentMax * 1.2));
      logger.info('Memory usage normal, increasing rate limit', { 
        memPercent: memPercent.toFixed(2),
        newMax: currentMax 
      });
    }
  }, 60000); // Check every minute

  return createRateLimiter({
    ...baseOptions,
    max: () => currentMax
  });
}

/**
 * Rate limit info middleware
 */
function rateLimitInfo(req, res, next) {
  res.on('finish', () => {
    if (res.getHeader('X-RateLimit-Limit')) {
      logger.debug('Rate limit info', {
        ip: req.ip,
        path: req.path,
        limit: res.getHeader('X-RateLimit-Limit'),
        remaining: res.getHeader('X-RateLimit-Remaining'),
        reset: res.getHeader('X-RateLimit-Reset')
      });
    }
  });
  next();
}

module.exports = {
  createRateLimiter,
  createUserRateLimiter,
  createAdaptiveRateLimiter,
  generalLimiter,
  strictLimiter,
  aiLimiter,
  authLimiter,
  uploadLimiter,
  exportLimiter,
  rateLimitInfo
};
