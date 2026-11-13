const request = require('supertest');
const app = require('../app');

describe('Payment & MoMo Gateway API', () => {
  it('should respond to payment endpoints', async () => {
    const res = await request(app).get('/api/v1/payments');
    expect([200, 401, 403]).toContain(res.statusCode);
  });
});
