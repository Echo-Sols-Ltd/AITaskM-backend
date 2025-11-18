const axios = require('axios');
const Logger = require('./logger');
const redisCache = require('./redisCache');
const { aiRequestQueue } = require('./requestQueue');

const logger = new Logger('AI_CLIENT');

class AIClient {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;
    this.retryAttempts = parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS) || 3;
    this.cache = new Map(); // Fallback in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.useRedis = process.env.REDIS_URL ? true : false;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info('AI Client initialized', { baseURL: this.baseURL });
  }

  /**
   * Call AI service with retry logic
   */
  async callWithRetry(endpoint, data, method = 'POST') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(`AI Service call attempt ${attempt}/${this.retryAttempts}`, { endpoint });
        
        const response = await this.client.request({
          method,
          url: endpoint,
          data: method !== 'GET' ? data : undefined,
          params: method === 'GET' ? data : undefined
        });
        
        logger.info('AI Service call successful', { endpoint, status: response.status });
        return response.data;
      } catch (error) {
        lastError = error;
        logger.warn(`AI Service call failed (attempt ${attempt}/${this.retryAttempts})`, {
          endpoint,
          error: error.message,
          status: error.response?.status
        });
        
        if (attempt < this.retryAttempts) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    logger.error('AI Service call failed after all retries', {
      endpoint,
      error: lastError.message
    });
    throw lastError;
  }

  /**
   * Get cache key for request
   */
  getCacheKey(operation, ...args) {
    return `ai:${operation}:${JSON.stringify(args)}`;
  }

  /**
   * Get from cache (Redis or memory)
   */
  async getFromCache(key) {
    if (this.useRedis) {
      return await redisCache.get(key);
    }
    
    // Fallback to memory cache
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set in cache (Redis or memory)
   */
  async setInCache(key, value, ttl = 300) {
    if (this.useRedis) {
      await redisCache.set(key, value, ttl);
    } else {
      // Fallback to memory cache
      this.cache.set(key, {
        data: value,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for AI service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/ai/healthcheck');
      logger.info('AI Service health check passed', response.data);
      return { healthy: true, ...response.data };
    } catch (error) {
      logger.error('AI Service health check failed', { error: error.message });
      return { healthy: false, error: error.message };
    }
  }

  /**
   * AI-powered task assignment
   */
  async assignTasks(tasks, employees, criteria = {}) {
    const cacheKey = this.getCacheKey('assign', tasks, employees);
    const cached = await this.getFromCache(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached AI assignment result');
      return cached;
    }

    // Use request queue for AI calls
    return await aiRequestQueue.enqueue(async () => {
      try {
      const payload = {
        tasks: tasks.map(task => ({
          task_id: task._id || task.id,
          title: task.title,
          priority: task.priority,
          estimated_hours: task.estimatedHours || 8,
          deadline: task.deadline,
          required_skills: task.tags || [],
          task_type: task.category || 'general'
        })),
        employees: employees.map(emp => ({
          id: emp._id || emp.id,
          name: emp.name,
          role: emp.role || emp.position,
          current_tasks: emp.currentTasks || 0,
          historical_completion_rate: emp.completionRate || 0.8,
          average_completion_time_hours: emp.avgCompletionTime || 8,
          skills: emp.skills || [],
          department: emp.department
        })),
        criteria
      };

        const result = await this.callWithRetry('/api/ai/assign-tasks', payload);
        
        // Cache the result
        await this.setInCache(cacheKey, result, 300);

        return result;
      } catch (error) {
        logger.error('AI task assignment failed, using fallback', { error: error.message });
        return this.fallbackAssignment(tasks, employees);
      }
    }, 2); // Priority 2 for task assignment
  }

  /**
   * Fallback assignment logic when AI service is unavailable
   */
  fallbackAssignment(tasks, employees) {
    logger.warn('Using fallback assignment logic');
    
    const assignments = [];
    const employeeWorkload = {};
    
    employees.forEach(emp => {
      employeeWorkload[emp._id || emp.id] = emp.currentTasks || 0;
    });

    tasks.forEach(task => {
      const availableEmployees = employees.filter(emp => 
        !emp.maxTasks || employeeWorkload[emp._id || emp.id] < emp.maxTasks
      );

      if (availableEmployees.length === 0) {
        logger.warn('No available employees for task', { taskId: task._id || task.id });
        return;
      }

      const assignedEmployee = availableEmployees.reduce((prev, curr) => 
        employeeWorkload[curr._id || curr.id] < employeeWorkload[prev._id || prev.id] ? curr : prev
      );

      assignments.push({
        task_id: task._id || task.id,
        assigned_to: assignedEmployee._id || assignedEmployee.id,
        reason: `Assigned based on workload balance (${employeeWorkload[assignedEmployee._id || assignedEmployee.id]} active tasks)`,
        confidence: 0.6
      });

      employeeWorkload[assignedEmployee._id || assignedEmployee.id]++;
    });

    return { assignments };
  }

  /**
   * Reassign overdue tasks
   */
  async reassignOverdue(overdueTasks, employees) {
    try {
      const payload = {
        overdue_tasks: overdueTasks.map(task => ({
          task_id: task._id || task.id,
          title: task.title,
          priority: task.priority,
          days_overdue: Math.floor((Date.now() - new Date(task.deadline)) / (1000 * 60 * 60 * 24))
        })),
        employees: employees.map(emp => ({
          id: emp._id || emp.id,
          name: emp.name,
          current_tasks: emp.currentTasks || 0,
          historical_completion_rate: emp.completionRate || 0.8
        }))
      };

      return await this.callWithRetry('/api/ai/reassign-overdue', payload);
    } catch (error) {
      logger.error('AI reassignment failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance score for employee(s)
   */
  async getPerformanceScore(employeeId = null) {
    try {
      const endpoint = employeeId 
        ? `/api/ai/performance-score/${employeeId}`
        : '/api/ai/performance-score';
      
      return await this.callWithRetry(endpoint, {}, 'GET');
    } catch (error) {
      logger.error('Failed to get performance score', { error: error.message });
      throw error;
    }
  }

  /**
   * Get weekly report
   */
  async getWeeklyReport() {
    try {
      return await this.callWithRetry('/api/ai/report/weekly', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get weekly report', { error: error.message });
      throw error;
    }
  }

  /**
   * Prioritize tasks
   */
  async prioritizeTasks(tasks) {
    try {
      const payload = {
        tasks: tasks.map(task => ({
          task_id: task._id || task.id,
          title: task.title,
          priority: task.priority,
          deadline: task.deadline,
          estimated_hours: task.estimatedHours || 8
        }))
      };

      return await this.callWithRetry('/api/ai/prioritize', payload);
    } catch (error) {
      logger.error('AI prioritization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get AI suggestions for user
   */
  async getSuggestions(userId, context = null) {
    try {
      const params = { userId };
      if (context) params.context = context;
      
      return await this.callWithRetry('/api/ai/suggestions', params, 'GET');
    } catch (error) {
      logger.error('Failed to get AI suggestions', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze performance
   */
  async analyzePerformance(userId, timeframe = 'week', metrics = {}) {
    try {
      const payload = { userId, timeframe, metrics };
      return await this.callWithRetry('/api/ai/analyze-performance', payload);
    } catch (error) {
      logger.error('Performance analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get anomalies
   */
  async getAnomalies() {
    try {
      return await this.callWithRetry('/api/ai/analytics/anomalies', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get anomalies', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance trends
   */
  async getTrends() {
    try {
      return await this.callWithRetry('/api/ai/analytics/trends', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Train models
   */
  async trainModels() {
    try {
      logger.info('Initiating model training');
      return await this.callWithRetry('/api/ai/test/train', {});
    } catch (error) {
      logger.error('Model training failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model drift report
   */
  async getDriftReport() {
    try {
      return await this.callWithRetry('/api/ai/monitoring/drift-report', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get drift report', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance() {
    try {
      return await this.callWithRetry('/api/ai/monitoring/performance', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get model performance', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model versions
   */
  async getModelVersions() {
    try {
      return await this.callWithRetry('/api/ai/monitoring/versions', {}, 'GET');
    } catch (error) {
      logger.error('Failed to get model versions', { error: error.message });
      throw error;
    }
  }

  /**
   * Compare model versions
   */
  async compareVersions(version1, version2) {
    try {
      const params = { version1, version2 };
      return await this.callWithRetry('/api/ai/monitoring/compare-versions', params, 'GET');
    } catch (error) {
      logger.error('Failed to compare versions', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    if (this.useRedis) {
      await redisCache.delPattern('ai:*');
    } else {
      this.cache.clear();
    }
    logger.info('AI Client cache cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (this.useRedis) {
      return await redisCache.getStats();
    }
    return {
      type: 'memory',
      size: this.cache.size,
      maxAge: this.cacheTimeout
    };
  }
}

// Create singleton instance
const aiClient = new AIClient();

module.exports = aiClient;
