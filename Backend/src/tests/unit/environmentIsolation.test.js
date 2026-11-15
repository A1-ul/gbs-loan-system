const bcrypt = require('bcryptjs');

jest.mock('../../config/database', () => ({
  prisma: {
    systemLockState: { findFirst: jest.fn() },
    tenant: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../../services/notification.service', () => ({
  queue: jest.fn().mockResolvedValue({ deliveryResult: { delivered: false, provider: 'NONE_CONFIGURED' } }),
}));

const { prisma } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const authService = require('../../services/auth.service');
const { signAccessToken, verifyAccessToken } = require('../../utils/jwt');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('Demo Learning Sandbox vs Real-Life Production Environment Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.systemLockState.findFirst.mockResolvedValue(null);
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
    prisma.user.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
  });

  describe('authenticate middleware boundary', () => {
    const demoUserRecord = {
      id: 'user-demo-1',
      tenantId: 'tenant-demo-1',
      branchId: 'branch-demo-1',
      email: 'demo.owner@gbsloan.com',
      role: 'COMPANY_OWNER',
      status: 'ACTIVE',
      deletedAt: null,
      tenant: {
        id: 'tenant-demo-1',
        code: 'DEMO-SANDBOX',
        name: 'GBS Demo Walkthrough Sandbox',
        status: 'ACTIVE',
        onboardingStatus: 'APPROVED',
        isLifetime: false,
        subExpiry: null,
      },
    };

    const prodUserRecord = {
      id: 'user-prod-1',
      tenantId: 'tenant-prod-1',
      branchId: 'branch-prod-1',
      email: 'owner@realmicrofinance.com',
      role: 'COMPANY_OWNER',
      status: 'ACTIVE',
      deletedAt: null,
      tenant: {
        id: 'tenant-prod-1',
        code: 'REAL-MF-01',
        name: 'Real Microfinance Ltd',
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE_TRIAL',
        isLifetime: false,
        subExpiry: new Date(Date.now() + 15 * 86400000),
      },
    };

    it('blocks DEMO-SANDBOX token from executing inside X-Environment-Mode: PRODUCTION_LIVE', async () => {
      prisma.user.findUnique.mockResolvedValue(demoUserRecord);
      const token = signAccessToken({ userId: demoUserRecord.id, role: 'COMPANY_OWNER', tenantId: demoUserRecord.tenantId, isDemo: true });
      const req = {
        headers: { authorization: `Bearer ${token}`, 'x-environment-mode': 'PRODUCTION_LIVE' },
        originalUrl: '/api/v1/loans',
      };
      const res = makeRes();
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENVIRONMENT_ISOLATION_VIOLATION' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks PRODUCTION_LIVE token from executing inside X-Environment-Mode: DEMO_SANDBOX', async () => {
      prisma.user.findUnique.mockResolvedValue(prodUserRecord);
      const token = signAccessToken({ userId: prodUserRecord.id, role: 'COMPANY_OWNER', tenantId: prodUserRecord.tenantId, isDemo: false });
      const req = {
        headers: { authorization: `Bearer ${token}`, 'x-environment-mode': 'DEMO_SANDBOX' },
        originalUrl: '/api/v1/loans',
      };
      const res = makeRes();
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENVIRONMENT_ISOLATION_VIOLATION' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects forged isDemo token claim mismatching database tenant', async () => {
      prisma.user.findUnique.mockResolvedValue(prodUserRecord);
      const token = signAccessToken({ userId: prodUserRecord.id, role: 'COMPANY_OWNER', tenantId: prodUserRecord.tenantId, isDemo: true });
      const req = {
        headers: { authorization: `Bearer ${token}` },
        originalUrl: '/api/v1/dashboard/overview',
      };
      const res = makeRes();
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('allows matching DEMO_SANDBOX and PRODUCTION_LIVE requests cleanly', async () => {
      prisma.user.findUnique.mockResolvedValue(demoUserRecord);
      const demoToken = signAccessToken({ userId: demoUserRecord.id, role: 'COMPANY_OWNER', tenantId: demoUserRecord.tenantId, isDemo: true });
      const demoReq = {
        headers: { authorization: `Bearer ${demoToken}`, 'x-environment-mode': 'DEMO_SANDBOX' },
        originalUrl: '/api/v1/dashboard/overview',
      };
      const demoNext = jest.fn();
      await authenticate(demoReq, makeRes(), demoNext);
      expect(demoNext).toHaveBeenCalledWith();
      expect(demoReq.isDemo).toBe(true);
      expect(demoReq.environmentMode).toBe('DEMO_SANDBOX');

      prisma.user.findUnique.mockResolvedValue(prodUserRecord);
      const prodToken = signAccessToken({ userId: prodUserRecord.id, role: 'COMPANY_OWNER', tenantId: prodUserRecord.tenantId, isDemo: false });
      const prodReq = {
        headers: { authorization: `Bearer ${prodToken}`, 'x-environment-mode': 'PRODUCTION_LIVE' },
        originalUrl: '/api/v1/dashboard/overview',
      };
      const prodNext = jest.fn();
      await authenticate(prodReq, makeRes(), prodNext);
      expect(prodNext).toHaveBeenCalledWith();
      expect(prodReq.isDemo).toBe(false);
      expect(prodReq.environmentMode).toBe('PRODUCTION_LIVE');
    });
  });

  describe('authService cross-environment login & registration guards', () => {
    it('rejects self-registration targeting DEMO-SANDBOX', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.findFirst.mockResolvedValue({
        id: 'tenant-demo-1',
        code: 'DEMO-SANDBOX',
        name: 'GBS Demo Walkthrough Sandbox',
        onboardingStatus: 'APPROVED',
      });

      await expect(authService.register({
        firstName: 'Kofi',
        lastName: 'Mensah',
        email: 'kofi@example.com',
        phone: '+233240000111',
        password: 'Password123!',
        role: 'LOAN_OFFICER',
        tenantCode: 'DEMO-SANDBOX',
      })).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects DEMO-SANDBOX user logging in via Production login endpoint', async () => {
      const hash = await bcrypt.hash('DemoPass123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-demo-2',
        tenantId: 'tenant-demo-1',
        email: 'demo.owner@gbsloan.com',
        passwordHash: hash,
        role: 'COMPANY_OWNER',
        status: 'ACTIVE',
        deletedAt: null,
        tenant: { code: 'DEMO-SANDBOX', name: 'GBS Demo Walkthrough Sandbox', onboardingStatus: 'APPROVED' },
      });

      await expect(authService.login({
        email: 'demo.owner@gbsloan.com',
        password: 'DemoPass123!',
      }, { environmentMode: 'PRODUCTION_LIVE' })).rejects.toMatchObject({ statusCode: 403 });
    });

    it('tags Production login JWT with isDemo=false and environmentMode=PRODUCTION_LIVE', async () => {
      const hash = await bcrypt.hash('RealPass123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-prod-2',
        tenantId: 'tenant-prod-1',
        branchId: 'branch-prod-1',
        email: 'officer@realfinance.com',
        passwordHash: hash,
        role: 'LOAN_OFFICER',
        status: 'ACTIVE',
        firstName: 'Ama',
        lastName: 'Serwaa',
        phone: '+233201234567',
        twoFactorEnabled: false,
        facialEnrolled: false,
        qualificationVerified: true,
        deletedAt: null,
        tenant: {
          id: 'tenant-prod-1',
          code: 'REAL-MF-01',
          name: 'Real Finance Ltd',
          status: 'ACTIVE',
          onboardingStatus: 'ACTIVE_TRIAL',
          isLifetime: false,
          subExpiry: new Date(Date.now() + 10 * 86400000),
        },
        voiceProfile: null,
      });

      const res = await authService.login({
        email: 'officer@realfinance.com',
        password: 'RealPass123!',
      }, { environmentMode: 'PRODUCTION_LIVE' });

      const decoded = verifyAccessToken(res.accessToken);
      expect(decoded.isDemo).toBe(false);
      expect(decoded.environmentMode).toBe('PRODUCTION_LIVE');
      expect(res.user.isDemo).toBe(false);
      expect(res.user.environmentMode).toBe('PRODUCTION_LIVE');
    });
  });
});

