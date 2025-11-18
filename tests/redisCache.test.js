const redisCache = require('../utils/redisCache');

describe('Redis Cache', () => {
  beforeAll(async () => {
    // Wait for Redis to connect if available
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Clean up test keys
    if (redisCache.isConnected) {
      await redisCache.delPattern('test:*');
    }
  });

  test('should set and get values', async () => {
    const key = 'test:key1';
    const value = { data: 'test value' };

    await redisCache.set(key, value);
    const result = await redisCache.get(key);

    expect(result).toEqual(value);
  });

  test('should return null for non-existent keys', async () => {
    const result = await redisCache.get('test:nonexistent');
    expect(result).toBeNull();
  });

  test('should delete keys', async () => {
    const key = 'test:key2';
    await redisCache.set(key, { data: 'test' });
    
    await redisCache.del(key);
    const result = await redisCache.get(key);

    expect(result).toBeNull();
  });

  test('should check if key exists', async () => {
    const key = 'test:key3';
    await redisCache.set(key, { data: 'test' });

    const exists = await redisCache.exists(key);
    expect(exists).toBe(true);

    await redisCache.del(key);
    const notExists = await redisCache.exists(key);
    expect(notExists).toBe(false);
  });

  test('should increment counters', async () => {
    const key = 'test:counter';

    const count1 = await redisCache.incr(key);
    const count2 = await redisCache.incr(key);
    const count3 = await redisCache.incr(key);

    expect(count1).toBe(1);
    expect(count2).toBe(2);
    expect(count3).toBe(3);
  });

  test('should delete keys by pattern', async () => {
    await redisCache.set('test:pattern:1', { data: '1' });
    await redisCache.set('test:pattern:2', { data: '2' });
    await redisCache.set('test:other', { data: 'other' });

    const deleted = await redisCache.delPattern('test:pattern:*');

    if (redisCache.isConnected) {
      expect(deleted).toBe(2);
      
      const result1 = await redisCache.get('test:pattern:1');
      const result2 = await redisCache.get('test:pattern:2');
      const result3 = await redisCache.get('test:other');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).not.toBeNull();
    }
  });

  test('should wrap async functions', async () => {
    const key = 'test:wrap';
    let callCount = 0;

    const fn = async () => {
      callCount++;
      return { data: 'wrapped result' };
    };

    // First call should execute function
    const result1 = await redisCache.wrap(key, fn);
    expect(result1).toEqual({ data: 'wrapped result' });
    expect(callCount).toBe(1);

    // Second call should use cache
    const result2 = await redisCache.wrap(key, fn);
    expect(result2).toEqual({ data: 'wrapped result' });
    
    if (redisCache.isConnected) {
      expect(callCount).toBe(1); // Function not called again
    }
  });

  test('should get cache statistics', async () => {
    const stats = await redisCache.getStats();

    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('keys');
  });
});
