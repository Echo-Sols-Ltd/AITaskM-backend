const aiClient = require('../utils/aiClient');
const Logger = require('../utils/logger');

const logger = new Logger('AI_HEALTH');

/**
 * Middleware to check AI service health before processing requests
 */
async function checkAIHealth(req, res, next) {
  try {
    const health = await aiClient.healthCheck();
    
    if (!health.healthy) {
      logger.warn('AI service is unhealthy', health);
      req.aiServiceAvailable = false;
    } else {
      req.aiServiceAvailable = true;
    }
    
    next();
  } catch (error) {
    logger.error('AI health check failed', { error: error.message });
    req.aiServiceAvailable = false;
    next();
  }
}

/**
 * Middleware to require AI service to be healthy
 */
async function requireAIService(req, res, next) {
  try {
    const health = await aiClient.healthCheck();
    
    if (!health.healthy) {
      return res.status(503).json({
        message: 'AI service is currently unavailable',
        error: 'Service unavailable',
        fallbackAvailable: true
      });
    }
    
    next();
  } catch (error) {
    logger.error('AI service check failed', { error: error.message });
    return res.status(503).json({
      message: 'AI service is currently unavailable',
      error: error.message,
      fallbackAvailable: true
    });
  }
}

module.exports = {
  checkAIHealth,
  requireAIService
};
