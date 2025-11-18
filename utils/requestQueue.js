const Logger = require('./logger');

const logger = new Logger('REQUEST_QUEUE');

class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.timeout = options.timeout || 30000;
    
    this.queue = [];
    this.running = 0;
    this.completed = 0;
    this.failed = 0;
    this.timeouts = 0;
  }

  /**
   * Add request to queue
   */
  async enqueue(fn, priority = 0) {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.queue.length >= this.maxQueueSize) {
        logger.warn('Queue is full', { 
          queueSize: this.queue.length, 
          maxSize: this.maxQueueSize 
        });
        return reject(new Error('Queue is full'));
      }

      const request = {
        fn,
        priority,
        resolve,
        reject,
        addedAt: Date.now(),
        timeoutId: null
      };

      // Set timeout
      request.timeoutId = setTimeout(() => {
        this.timeouts++;
        const index = this.queue.indexOf(request);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
        logger.warn('Request timeout', { 
          queuePosition: index,
          waitTime: Date.now() - request.addedAt 
        });
        reject(new Error('Request timeout'));
      }, this.timeout);

      // Add to queue with priority
      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority);

      logger.debug('Request enqueued', { 
        queueSize: this.queue.length,
        priority,
        running: this.running 
      });

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    // Check if we can process more requests
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Get next request
    const request = this.queue.shift();
    if (!request) return;

    // Clear timeout
    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }

    this.running++;
    const startTime = Date.now();

    try {
      logger.debug('Processing request', { 
        running: this.running,
        queueSize: this.queue.length,
        waitTime: startTime - request.addedAt
      });

      const result = await request.fn();
      
      this.completed++;
      request.resolve(result);

      logger.debug('Request completed', { 
        duration: Date.now() - startTime,
        completed: this.completed
      });
    } catch (error) {
      this.failed++;
      request.reject(error);

      logger.error('Request failed', { 
        error: error.message,
        failed: this.failed
      });
    } finally {
      this.running--;
      
      // Process next request
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
      timeouts: this.timeouts,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize
    };
  }

  /**
   * Clear queue
   */
  clear() {
    // Clear all timeouts
    this.queue.forEach(request => {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.reject(new Error('Queue cleared'));
    });

    this.queue = [];
    logger.info('Queue cleared');
  }

  /**
   * Update configuration
   */
  configure(options) {
    if (options.maxConcurrent) {
      this.maxConcurrent = options.maxConcurrent;
    }
    if (options.maxQueueSize) {
      this.maxQueueSize = options.maxQueueSize;
    }
    if (options.timeout) {
      this.timeout = options.timeout;
    }

    logger.info('Queue configuration updated', {
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      timeout: this.timeout
    });
  }
}

// Create queues for different types of requests
const aiRequestQueue = new RequestQueue({
  maxConcurrent: 3,
  maxQueueSize: 50,
  timeout: 30000
});

const analyticsQueue = new RequestQueue({
  maxConcurrent: 5,
  maxQueueSize: 100,
  timeout: 15000
});

const generalQueue = new RequestQueue({
  maxConcurrent: 10,
  maxQueueSize: 200,
  timeout: 10000
});

module.exports = {
  RequestQueue,
  aiRequestQueue,
  analyticsQueue,
  generalQueue
};
