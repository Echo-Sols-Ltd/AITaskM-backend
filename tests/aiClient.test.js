const aiClient = require('../utils/aiClient');

describe('AI Client', () => {
  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await aiClient.healthCheck();
      expect(health).toHaveProperty('healthy');
    });
  });

  describe('Task Assignment', () => {
    test('should assign tasks to employees', async () => {
      const tasks = [
        {
          id: 'task1',
          title: 'Test Task',
          priority: 'high',
          estimatedHours: 8
        }
      ];

      const employees = [
        {
          id: 'emp1',
          name: 'John Doe',
          role: 'Developer',
          currentTasks: 2
        }
      ];

      const result = await aiClient.assignTasks(tasks, employees);
      
      expect(result).toHaveProperty('assignments');
      expect(Array.isArray(result.assignments)).toBe(true);
    });

    test('should use fallback when AI unavailable', async () => {
      // Mock AI service failure
      const originalBaseURL = aiClient.baseURL;
      aiClient.baseURL = 'http://invalid-url:9999';

      const tasks = [{ id: 'task1', title: 'Test' }];
      const employees = [{ id: 'emp1', name: 'John', currentTasks: 0 }];

      const result = await aiClient.assignTasks(tasks, employees);
      
      expect(result).toHaveProperty('assignments');
      expect(result.assignments.length).toBeGreaterThan(0);

      // Restore
      aiClient.baseURL = originalBaseURL;
    });
  });

  describe('Caching', () => {
    test('should cache results', async () => {
      const key = 'test:cache:key';
      const value = { test: 'data' };

      await aiClient.setInCache(key, value);
      const cached = await aiClient.getFromCache(key);

      expect(cached).toEqual(value);
    });

    test('should clear cache', async () => {
      const key = 'test:cache:key2';
      await aiClient.setInCache(key, { data: 'test' });
      
      await aiClient.clearCache();
      
      const cached = await aiClient.getFromCache(key);
      expect(cached).toBeNull();
    });
  });

  describe('Performance Score', () => {
    test('should get performance score', async () => {
      const score = await aiClient.getPerformanceScore('test-user-id');
      
      expect(score).toBeDefined();
      // Score might be null if AI service is down, which is okay
    });
  });

  describe('Suggestions', () => {
    test('should get AI suggestions', async () => {
      const suggestions = await aiClient.getSuggestions('test-user-id');
      
      expect(suggestions).toBeDefined();
    });
  });
});
