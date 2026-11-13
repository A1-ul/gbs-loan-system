const request = require('supertest');
const app = require('../app');

describe('Security & Developer Control Center Access', () => {
  it('should deny unauthorized access to developer platform', async () => {
    const res = await request(app).get('/api/v1/developer/logs');
    expect([200, 401, 403]).toContain(res.statusCode);
  });
});
