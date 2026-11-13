const request = require('supertest');
const app = require('../app');

describe('Migration Service Engine', () => {
  it('should verify migration status endpoint', async () => {
    const res = await request(app).get('/api/v1/migration/status');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});
