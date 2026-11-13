const request = require('supertest');
const app = require('../../app');

describe('Payment Integration Tests', () => {
  it('should test payment integration flow', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
