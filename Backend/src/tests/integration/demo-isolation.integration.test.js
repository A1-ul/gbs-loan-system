const request = require('supertest');
const app = require('../../app');
const { prisma } = require('../../config/database');
const { redis } = require('../../config/redis');

describe('GBS Demo Walkthrough Separation & Self-Service Navigation Integration Suite', () => {
  let demoExistedBefore = false;
  let ownerDemoToken = '';
  let memberDemoToken = '';
  let guarantorDemoToken = '';

  beforeAll(async () => {
    const existing = await prisma.tenant.findUnique({ where: { code: 'DEMO-SANDBOX' } });
    demoExistedBefore = Boolean(existing);
  });

  afterAll(async () => {
    try {
      if (!demoExistedBefore) {
        const demoTenant = await prisma.tenant.findUnique({ where: { code: 'DEMO-SANDBOX' } });
        if (demoTenant) {
          const tid = demoTenant.id;
          await prisma.loanWorkflowLog.deleteMany({ where: { loan: { tenantId: tid } } }).catch(() => null);
          await prisma.payment.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.repaymentSchedule.deleteMany({ where: { loan: { tenantId: tid } } }).catch(() => null);
          await prisma.loanGuarantor.deleteMany({ where: { loan: { tenantId: tid } } }).catch(() => null);
          await prisma.loan.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.collector.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.member.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.guarantor.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.staff.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.tenantLocation.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.loanProduct.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.auditLog.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.user.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.branch.deleteMany({ where: { tenantId: tid } }).catch(() => null);
          await prisma.tenant.deleteMany({ where: { id: tid } }).catch(() => null);
        }
      }
    } finally {
      await prisma.$disconnect().catch(() => null);
      if (redis && typeof redis.quit === 'function') {
        await redis.quit().catch(() => null);
      }
    }
  });

  it('serves walkthrough catalog with 8 feature modules and all 29 canonical roles', async () => {
    const res = await request(app).get('/api/v1/demo/walkthrough-catalog');
    expect(res.status).toBe(200);
    expect(res.body.data.dataMode).toBe('DEMO_SANDBOX_ISOLATED');
    expect(res.body.data.sandboxTenantCode).toBe('DEMO-SANDBOX');
    expect(res.body.data.walkthroughModules.length).toBe(8);
    expect(res.body.data.roles.length).toBe(29);
  });

  it('strictly blocks Developer Authority escalation through the Demo endpoint', async () => {
    const devRes = await request(app)
      .post('/api/v1/demo/walkthrough-session')
      .send({ role: 'DEVELOPER' });
    expect([401, 403]).toContain(devRes.status);

    const leadDevRes = await request(app)
      .post('/api/v1/demo/walkthrough-session')
      .send({ role: 'LEAD_DEVELOPER' });
    expect([401, 403]).toContain(leadDevRes.status);
  });

  it('launches an isolated DEMO-SANDBOX COMPANY_OWNER session, excludes DEMO-SANDBOX from public directory, and denies developer routes', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/demo/walkthrough-session')
      .send({ role: 'COMPANY_OWNER' });

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.isDemo).toBe(true);
    expect(sessionRes.body.data.environmentMode).toBe('DEMO_SANDBOX');
    expect(sessionRes.body.data.user.tenantCode).toBe('DEMO-SANDBOX');
    expect(sessionRes.body.data.user.isDemo).toBe(true);
    ownerDemoToken = sessionRes.body.data.accessToken;
    expect(ownerDemoToken).toBeTruthy();

    // Excluded from real-life public institutional login directory
    const pubDirRes = await request(app).get('/api/v1/tenants/public-directory');
    expect(pubDirRes.status).toBe(200);
    const hasDemoInPublicDir = (pubDirRes.body.data || []).some((t) => t.code === 'DEMO-SANDBOX');
    expect(hasDemoInPublicDir).toBe(false);

    // Works across operational dashboard & hidden customer GPS lookup inside sandbox
    const overviewRes = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${ownerDemoToken}`);
    expect(overviewRes.status).toBe(200);

    const hiddenSearchRes = await request(app)
      .get('/api/v1/members?includeHidden=true&search=GA-492-9910')
      .set('Authorization', `Bearer ${ownerDemoToken}`);
    expect(hiddenSearchRes.status).toBe(200);
    expect((hiddenSearchRes.body.data || []).some((m) => m.isHidden === true)).toBe(true);

    // Strictly denied from isolated Developer Portal APIs
    const forbiddenDevApi = await request(app)
      .get('/api/v1/developer/tenants')
      .set('Authorization', `Bearer ${ownerDemoToken}`);
    expect([401, 403]).toContain(forbiddenDevApi.status);
  });

  it('supports MEMBER_PORTAL self-service loans and payments loading', async () => {
    const res = await request(app)
      .post('/api/v1/demo/walkthrough-session')
      .send({ role: 'MEMBER_PORTAL' });
    expect(res.status).toBe(200);
    memberDemoToken = res.body.data.accessToken;

    const loansRes = await request(app)
      .get('/api/v1/loans/my-loans')
      .set('Authorization', `Bearer ${memberDemoToken}`);
    expect(loansRes.status).toBe(200);
    const loans = loansRes.body.data || [];
    expect(loans.length).toBeGreaterThanOrEqual(2);
    const flatPayments = loans.flatMap((l) => l.payments || []);
    expect(flatPayments.length).toBeGreaterThanOrEqual(1);
    expect(flatPayments.some((p) => p.paymentRef === 'PAY-DEMO-1001')).toBe(true);
  });

  it('supports GUARANTOR_PORTAL self-service /guarantors/my-guarantees while blocking staff /guarantors', async () => {
    const res = await request(app)
      .post('/api/v1/demo/walkthrough-session')
      .send({ role: 'GUARANTOR_PORTAL' });
    expect(res.status).toBe(200);
    guarantorDemoToken = res.body.data.accessToken;

    const myGuaranteesRes = await request(app)
      .get('/api/v1/guarantors/my-guarantees')
      .set('Authorization', `Bearer ${guarantorDemoToken}`);
    expect(myGuaranteesRes.status).toBe(200);
    expect(Array.isArray(myGuaranteesRes.body.data)).toBe(true);
    expect(myGuaranteesRes.body.data.length).toBe(1);
    expect(myGuaranteesRes.body.data[0].gpsAddress).toBe('GA-204-5512');

    const staffOnlyRes = await request(app)
      .get('/api/v1/guarantors')
      .set('Authorization', `Bearer ${guarantorDemoToken}`);
    expect(staffOnlyRes.status).toBe(403);

    // Guarantor role-scoped /dashboard/my-role & /loans/my-loans & /payments/my-payments, no borrower origination
    const gurRoleRes = await request(app)
      .get('/api/v1/dashboard/my-role')
      .set('Authorization', `Bearer ${guarantorDemoToken}`);
    expect(gurRoleRes.status).toBe(200);
    expect(gurRoleRes.body.data.capabilities.role).toBe('GUARANTOR_PORTAL');
    expect(gurRoleRes.body.data.capabilities.actions.canApplyLoan).toBe(false);
    expect(gurRoleRes.body.data.capabilities.allowedTabs).toEqual(['OVERVIEW', 'GUARANTORS', 'LOANS', 'PAYMENTS']);
    expect(gurRoleRes.body.data.summary.totalMembers).toBeUndefined();
    expect(gurRoleRes.body.data.datasets.salaries).toBeUndefined();
    expect(gurRoleRes.body.data.environmentProvenance.isProductionRecord).toBe(false);

    const gurLoansRes = await request(app)
      .get('/api/v1/loans/my-loans')
      .set('Authorization', `Bearer ${guarantorDemoToken}`);
    expect(gurLoansRes.status).toBe(200);

    const gurPaymentsRes = await request(app)
      .get('/api/v1/payments/my-payments')
      .set('Authorization', `Bearer ${guarantorDemoToken}`);
    expect(gurPaymentsRes.status).toBe(200);

    const gurBlockedApply = await request(app)
      .post('/api/v1/loans/apply')
      .set('Authorization', `Bearer ${guarantorDemoToken}`)
      .send({ principalAmount: 2000, termMonths: 6, purpose: 'Blocked Guarantor Origination' });
    expect(gurBlockedApply.status).toBe(403);
  });

  it('enforces exact role-scoped dashboards and blocks unauthorized HR/Marketing/Member endpoints', async () => {
    const memberRoleRes = await request(app)
      .get('/api/v1/dashboard/my-role')
      .set('Authorization', `Bearer ${memberDemoToken}`);
    expect(memberRoleRes.status).toBe(200);
    expect(memberRoleRes.body.data.summary.totalStaff).toBeUndefined();
    expect(memberRoleRes.body.data.datasets.staff).toBeUndefined();
    expect(memberRoleRes.body.data.datasets.complianceCases).toBeUndefined();

    const hrSess = await request(app).post('/api/v1/demo/walkthrough-session').send({ role: 'HUMAN_RESOURCE' });
    expect(hrSess.status).toBe(200);
    const hrToken = hrSess.body.data.accessToken;
    const hrRoleRes = await request(app).get('/api/v1/dashboard/my-role').set('Authorization', `Bearer ${hrToken}`);
    expect(hrRoleRes.status).toBe(200);
    expect(hrRoleRes.body.data.capabilities.allowedTabs).toEqual(['OVERVIEW', 'HR_PAYROLL', 'STAFF_COMMS', 'MEETINGS_REPORTS']);
    expect(hrRoleRes.body.data.datasets.recentLoans).toBeUndefined();

    const hrMembersBlocked = await request(app).get('/api/v1/members').set('Authorization', `Bearer ${hrToken}`);
    expect(hrMembersBlocked.status).toBe(403);
    const hrCasesBlocked = await request(app).get('/api/v1/enterprise/compliance-cases').set('Authorization', `Bearer ${hrToken}`);
    expect(hrCasesBlocked.status).toBe(403);

    const mktSess = await request(app).post('/api/v1/demo/walkthrough-session').send({ role: 'MARKETING' });
    expect(mktSess.status).toBe(200);
    const mktToken = mktSess.body.data.accessToken;
    const mktSalariesBlocked = await request(app).get('/api/v1/salaries').set('Authorization', `Bearer ${mktToken}`);
    expect(mktSalariesBlocked.status).toBe(403);
    const mktInvestorsBlocked = await request(app).get('/api/v1/enterprise/investors').set('Authorization', `Bearer ${mktToken}`);
    expect(mktInvestorsBlocked.status).toBe(403);

    // Company Owner sees executive capabilities inside tenant, never Developer tenant-approval authority
    const ownerRoleRes = await request(app).get('/api/v1/dashboard/my-role').set('Authorization', `Bearer ${ownerDemoToken}`);
    expect(ownerRoleRes.status).toBe(200);
    expect(ownerRoleRes.body.data.capabilities.actions.canApproveTenants).toBe(false);
    expect(ownerRoleRes.body.data.capabilities.allowedTabs).toContain('BRANDING_CCTV');
  });
});

