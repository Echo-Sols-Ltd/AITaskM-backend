const axios = require('axios');
const Logger = require('./logger');

const logger = new Logger('AI_CLIENT');

class AIClient {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;
    this.retryAttempts = parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS) || 3;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`AI Service Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`AI Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('AI Service Response Error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    logger.info('AI Client initialized', { baseURL: this.baseURL });
  }

  /**
   * Make request with retry logic
   */
  async callWithRetry(endpoint, data, method = 'POST', attempt = 1) {
    try {
      const response = await this.client({
        method,
        url: endpoint,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      });
      return response.data;
    } catch (error) {
      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        logger.warn(`Retrying AI service call (attempt ${attempt + 1}/${this.retryAttempts})`, {
          endpoint,
          error: error.message
        });
        await this.delay(1000 * attempt); // Exponential backoff
        return this.callWithRetry(endpoint, data, method, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    return (
      !error.response || // Network error
      error.response.status >= 500 || // Server error
      error.code === 'ECONNABORTED' // Timeout
    );
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate cache key
   */
  getCacheKey(operation, ...args) {
    return `${operation}:${JSON.stringify(args)}`;
  }

  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('Cache hit', { key });
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('AI Client cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/ai/healthcheck');
      return {
        status: 'ok',
        aiService: response.data,
        connected: true
      };
    } catch (error) {
      logger.error('AI Service health check failed', { error: error.message });
      return {
        status: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * AI-powered task assignment
   */
  async assignTasks(tasks, employees, criteria = {}) {
    const cacheKey = this.getCacheKey('assign-tasks', tasks, employees);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      logger.info('Calling AI service for task assignment', {
        taskCount: tasks.length,
        employeeCount: employees.length
      });

      const result = await this.callWithRetry('/api/ai/assign-tasks', {
        tasks,
        employees,
        criteria
      });

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('AI task assignment failed, using fallback', { error: error.message });
      return this.fallbackAssignment(tasks, employees);
    }
  }

  /**
   * Fallback assignment logic (when AI service is unavailable)
   */
  fallbackAssignment(tasks, employees) {
    logger.warn('Using fallback assignment logic');
    
    // Sort employees by current workload
    const sortedEmployees = [...employees].sort((a, b) => 
      (a.current_tasks || 0) - (b.current_tasks || 0)
    );

    const assignments = tasks.map((task, index) => {
      const employee = sortedEmployees[index % sortedEmployees.length];
      return {
        task_id: task.task_id || task._id || task.id,
        assigned_to: employee.id || employee._id,
        reason: 'Assigned based on workload balance (fallback mode)',
        confidence: 0.5,
        fallback: true
      };
    });

    return { assignments };
  }

  /**
   * Reassign overdue tasks
   */
  async reassignOverdue(overdueTasks, employees) {
    try {
      logger.info('Calling AI service for overdue task reassignment', {
        overdueCount: overdueTasks.length,
        employeeCount: employees.length
      });

      const result = await this.callWithRetry('/api/ai/reassign-overdue', {
        overdue_tasks: overdueTasks,
        employees
      });

      return result;
    } catch (error) {
      logger.error('AI overdue reassignment failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance score for all employees
   */
  async getPerformanceScores() {
    const cacheKey = this.getCacheKey('performance-scores');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      logger.info('Calling AI service for performance scores');

      const result = await this.callWithRetry('/api/ai/performance-score', {}, 'GET');

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('AI performance scores failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance score for specific employee
   */
  async getPerformanceScore(employeeId) {
    const cacheKey = this.getCacheKey('performance-score', employeeId);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      logger.info('Calling AI service for employee performance score', { employeeId });

      const result = await this.callWithRetry(`/api/ai/performance-score/${employeeId}`, {}, 'GET');

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('AI performance score failed', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Get weekly report
   */
  async getWeeklyReport() {
    try {
      logger.info('Calling AI service for weekly report');

      const result = await this.callWithRetry('/api/ai/report/weekly', {}, 'GET');

      return result;
    } catch (error) {
      logger.error('AI weekly report failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Prioritize tasks
   */
  async prioritizeTasks(tasks) {
    try {
      logger.info('Calling AI service for task prioritization', { taskCount: tasks.length });

      const result = await this.callWithRetry('/api/ai/prioritize', { tasks });

      return result;
    } catch (error) {
      logger.error('AI task prioritization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get AI suggestions for user
   */
  async getSuggestions(userId, context = '') {
    const cacheKey = this.getCacheKey('suggestions', userId, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      logger.info('Calling AI service for suggestions', { userId, context });

      const result = await this.callWithRetry('/api/ai/suggestions', { userId, context }, 'GET');

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('AI suggestions failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Analyze performance
   */
  async analyzePerformance(userId, timeframe = 'week', metrics = {}) {
    try {
      logger.info('Calling AI service for performance analysis', { userId, timeframe });

      const result = await this.callWithRetry('/api/ai/analyze-performance', {
        userId,
        timeframe,
        metrics
      });

      return result;
    } catch (error) {
      logger.error('AI performance analysis failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get anomalies
   */
  async getAnomalies() {
    try {
      logger.info('Calling AI service for anomaly detection');

      const result = await this.callWithRetry('/api/ai/analytics/anomalies', {}, 'GET');

      return result;
    } catch (error) {
      logger.error('AI anomaly detection failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get trends
   */
  async getTrends() {
    try {
      logger.info('Calling AI service for trend analysis');

      const result = await this.callWithRetry('/api/ai/analytics/trends', {}, 'GET');

      return result;
    } catch (error) {
      logger.error('AI trend analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Train models
   */
  async trainModels() {
    try {
      logger.info('Calling AI service to train models');

      const result = await this.callWithRetry('/api/ai/test/train', {});

      logger.info('AI model training completed', result);
      return result;
    } catch (error) {
      logger.error('AI model training failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model monitoring metrics
   */
  async getModelMetrics() {
    try {
      logger.info('Calling AI service for model metrics');

      const result = await this.callWithRetry('/api/ai/monitoring/performance', {}, 'GET');

      return result;
    } catch (error) {
      logger.error('AI model metrics failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get drift report
   */
  async getDriftReport() {
    try {
      logger.info('Calling AI service for drift report');

      const result = await this.callWithRetry('/api/ai/monitoring/drift-report', {}, 'GET');

      return result;
    } catch (error) {
      logger.error('AI drift report failed', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const aiClient = new AIClient();

module.exports = aiClient;
