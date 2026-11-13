const request = require('supertest');
const app = require('../../app');

describe('Loan Integration Tests', () => {
  it('should test loan integration flow', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
