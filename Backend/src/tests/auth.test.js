const request = require('supertest');
const app = require('../app');

describe('Authentication & User Management APIs', () => {
  it('should respond to GET /health with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
  });

  it('should validate user login payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email', password: '' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should reject OTP verification with invalid payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '', otp: '123' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should reject resend OTP with missing phone number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-otp')
      .send({});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
