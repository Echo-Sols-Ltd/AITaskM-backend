import { request } from "express";
import express from 'express';
import { createRateLimiter } from "../middleware/rateLimiter";

describe('Rate Limiter', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: 'Rate limit exceeded'
    });

    app.use('/test', limiter, (req, res) => {
      res.json({ success: true });
    });
  });

  test('should allow requests within limit', async () => {
    const response1 = await request(app).get('/test');
    const response2 = await request(app).get('/test');
    const response3 = await request(app).get('/test');

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
  });

  test('should block requests exceeding limit', async () => {
    await request(app).get('/test');
    await request(app).get('/test');
    await request(app).get('/test');
    
    const response4 = await request(app).get('/test');

    expect(response4.status).toBe(429);
    expect(response4.body).toHaveProperty('error');
  });

  test('should reset after window expires', async () => {
    await request(app).get('/test');
    await request(app).get('/test');
    await request(app).get('/test');

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
  });
});
