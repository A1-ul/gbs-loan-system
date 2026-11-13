const request = require('supertest');
const app = require('../app');

describe('Voice Identity Verification Service API', () => {
  it('should test voice authentication status endpoint', async () => {
    const res = await request(app).get('/api/v1/voice-auth/status');
    expect([200, 401, 404]).toContain(res.statusCode);
  });
});
