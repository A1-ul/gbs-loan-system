const request = require('supertest');
const app = require('../app');

describe('Loan Engine & Workflow API', () => {
  it('should return loan listing or auth error', async () => {
    const res = await request(app).get('/api/v1/loans');
    expect([200, 401, 403]).toContain(res.statusCode);
  });
});
