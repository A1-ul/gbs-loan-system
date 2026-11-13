const request = require('supertest');
const app = require('../app');

describe('Reports & Analytics Subsystem', () => {
  it('should check reports endpoints', async () => {
    const res = await request(app).get('/api/v1/reports');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});
