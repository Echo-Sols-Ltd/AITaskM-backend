const { RequestQueue } = require('../utils/requestQueue');

describe('Request Queue', () => {
  let queue;

  beforeEach(() => {
    queue = new RequestQueue({
      maxConcurrent: 2,
      maxQueueSize: 10,
      timeout: 1000
    });
  });

  afterEach(() => {
    queue.clear();
  });

  test('should process requests', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    
    const result = await queue.enqueue(fn);
    
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalled();
  });

  test('should respect concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const fn = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(resolve => setTimeout(resolve, 100));
      concurrent--;
      return 'done';
    };

    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(queue.enqueue(fn));
    }

    await Promise.all(promises);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test('should handle priority', async () => {
    const results = [];
    
    const fn = (value) => async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(value);
      return value;
    };

    // Fill queue
    queue.enqueue(fn('low'), 0);
    queue.enqueue(fn('high'), 10);
    queue.enqueue(fn('medium'), 5);

    await new Promise(resolve => setTimeout(resolve, 200));

    // High priority should be processed before low
    expect(results.indexOf('high')).toBeLessThan(results.indexOf('low'));
  });

  test('should timeout long requests', async () => {
    const fn = () => new Promise(resolve => setTimeout(resolve, 2000));

    await expect(queue.enqueue(fn)).rejects.toThrow('Request timeout');
  });

  test('should reject when queue is full', async () => {
    const fn = () => new Promise(resolve => setTimeout(resolve, 1000));

    // Fill queue
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(queue.enqueue(fn));
    }

    // This should be rejected
    await expect(queue.enqueue(fn)).rejects.toThrow('Queue is full');
  });

  test('should provide statistics', () => {
    const stats = queue.getStats();

    expect(stats).toHaveProperty('queueSize');
    expect(stats).toHaveProperty('running');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
  });
});
