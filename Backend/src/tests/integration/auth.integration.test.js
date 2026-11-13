const request = require('supertest');
const app = require('../../app');

describe('Auth Integration Tests', () => {
  it('should test auth integration endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
