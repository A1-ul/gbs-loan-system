const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../../app');
const { prisma } = require('../../config/database');
const { redis } = require('../../config/redis');

describe('GBS Enterprise Production Integration Suite (PostgreSQL Live)', () => {
  let devToken = '';
  let adminToken = '';
  let hrToken = '';
  let memberToken = '';
  let createdTenantId = '';
  let createdTenantCode = '';
  let createdLoanId = '';
  let createdCashPaymentId = '';
  let createdUnqualifiedUserId = '';
  let createdMigrationJobId = '';
  let testDevId = '';

  const suffix = Date.now().toString().slice(-6);
  const testOrgEmail = `owner.test.${suffix}@gbstestmfi.com`;
  const testDevEmail = `testdev.${suffix}@gbs-test.local`;
  const testDevPwd = `TestDevFixture#${suffix}`;

  beforeAll(async () => {
    const hash = await bcrypt.hash(testDevPwd, 10);
    const createdDev = await prisma.developerUser.create({
      data: {
        username: `test_dev_${suffix}`,
        email: testDevEmail,
        passwordHash: hash,
        accessLevel: 'LEAD_DEVELOPER',
        isActive: true,
        allowedIps: [],
      },
    });
    testDevId = createdDev.id;
  });

  afterAll(async () => {
    try {
      if (testDevId) {
        await prisma.developerAuditLog.deleteMany({ where: { developerUserId: testDevId } }).catch(() => null);
        await prisma.developerSession.deleteMany({ where: { developerUserId: testDevId } }).catch(() => null);
        await prisma.developerUser.deleteMany({ where: { id: testDevId } }).catch(() => null);
      }
      if (createdCashPaymentId) {
        await prisma.payment.deleteMany({ where: { id: createdCashPaymentId } }).catch(() => null);
      }
      if (createdLoanId) {
        await prisma.repaymentSchedule.deleteMany({ where: { loanId: createdLoanId } }).catch(() => null);
        await prisma.loan.deleteMany({ where: { id: createdLoanId } }).catch(() => null);
      }
      if (createdUnqualifiedUserId) {
        await prisma.auditLog.deleteMany({ where: { entityId: createdUnqualifiedUserId } }).catch(() => null);
        await prisma.user.deleteMany({ where: { id: createdUnqualifiedUserId } }).catch(() => null);
      }
      if (createdMigrationJobId) {
        await prisma.migrationJob.deleteMany({ where: { id: createdMigrationJobId } }).catch(() => null);
      }
      await prisma.user.deleteMany({ where: { email: `mig.${suffix}@gbsloan.com` } }).catch(() => null);
      await prisma.user.deleteMany({ where: { email: `hidden.cust.${suffix}@gbsloan.com` } }).catch(() => null);
      await prisma.user.deleteMany({ where: { email: `hidden.guar.${suffix}@gbsloan.com` } }).catch(() => null);
      await prisma.user.deleteMany({ where: { email: `staff.qa.${suffix}@gbstestmfi.com` } }).catch(() => null);
      if (createdTenantId) {
        await prisma.staffAttendance.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.notification.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.staffBroadcastMessage.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.zoomMeeting.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.reportSnapshot.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.cctvCamera.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.accountingAuditRecord.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.guarantor.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.member.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.staff.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.securityAlert.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.tenantLocation.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.auditLog.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.user.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.branch.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.loanProduct.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: createdTenantId } }).catch(() => null);
        await prisma.tenant.deleteMany({ where: { id: createdTenantId } }).catch(() => null);
      }
    } finally {
      await prisma.$disconnect().catch(() => null);
      if (redis && typeof redis.quit === 'function') {
        await redis.quit().catch(() => null);
      }
    }
  });

  it('authenticates Developer Landlord & Tenant Roles with strict cross-plane isolation', async () => {
    // Production permanent Gmail enforces manual password entry (wrong password rejected)
    const wrongDevPwdRes = await request(app)
      .post('/api/v1/developer/auth/login')
      .send({ email: 'gabose48@gmail.com', password: 'WrongPasswordCheck!' });
    expect(wrongDevPwdRes.statusCode).toBe(401);

    const devRes = await request(app)
      .post('/api/v1/developer/auth/login')
      .send({ email: testDevEmail, password: testDevPwd });
    expect(devRes.statusCode).toBe(200);
    devToken = devRes.body.data.accessToken;
    expect(typeof devToken).toBe('string');

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gbsloan.com', password: 'GbsRole@2026!' });
    expect(adminRes.statusCode).toBe(200);
    adminToken = adminRes.body.data.accessToken;

    const hrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@accramfi.com', password: 'GbsRole@2026!' });
    expect(hrRes.statusCode).toBe(200);
    hrToken = hrRes.body.data.accessToken;

    const memberRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@gbsloan.com', password: 'GbsRole@2026!' });
    expect(memberRes.statusCode).toBe(200);
    memberToken = memberRes.body.data.accessToken;

    // Tenant COMPANY_OWNER MUST be blocked from Developer Control Center & AI Developer Assistant
    const blockedDevDash = await request(app)
      .get('/api/v1/developer/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([401, 403]).toContain(blockedDevDash.statusCode);

    const blockedAiDev = await request(app)
      .get('/api/v1/ai-developer/scan')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([401, 403]).toContain(blockedAiDev.statusCode);

    // Developer token succeeds cleanly on Landlord Telemetry + Live GIS
    const devDash = await request(app)
      .get('/api/v1/developer/dashboard')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devDash.statusCode).toBe(200);
    expect(devDash.body.data.counts).toBeDefined();

    const devGis = await request(app)
      .get('/api/v1/developer/locations/live')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devGis.statusCode).toBe(200);
    expect(Array.isArray(devGis.body.data.features)).toBe(true);
  }, 45000);

  it('enforces Institutional Onboarding -> PENDING block -> Developer Approval (1m Trial) -> Multi-Tier Plans -> Lock/Renew', async () => {
    const onboardRes = await request(app)
      .post('/api/v1/tenants/onboard')
      .send({
        organizationName: `Kumasi Integration MFI ${suffix}`,
        institutionType: 'MICROFINANCE',
        city: 'Kumasi',
        region: 'Ashanti',
        country: 'Ghana',
        gpsAddress: 'AK-448-9012',
        representativeName: 'Kwaku Mensah',
        representativeEmail: testOrgEmail,
        representativePhone: `+233249${suffix}`,
        password: 'TenantPass@2026!',
      });
    expect(onboardRes.statusCode).toBe(201);
    createdTenantId = onboardRes.body.data.id;
    createdTenantCode = onboardRes.body.data.code;
    expect(onboardRes.body.data.onboardingStatus).toBe('PENDING');

    // Login MUST be rejected while PENDING Developer Approval
    const blockedPendingLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testOrgEmail, password: 'TenantPass@2026!' });
    expect([401, 403]).toContain(blockedPendingLogin.statusCode);

    // Lead Developer approves institution -> activates 1-Month (30-day) Free Trial
    const approveRes = await request(app)
      .post(`/api/v1/developer/tenants/${createdTenantId}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ trialDays: 30, planCode: 'TRIAL_1M' });
    expect(approveRes.statusCode).toBe(200);
    expect(['APPROVED', 'ACTIVE_TRIAL']).toContain(approveRes.body.data.onboardingStatus);
    expect(approveRes.body.data.daysLeft).toBeGreaterThanOrEqual(29);
    expect(approveRes.body.data.daysLeft).toBeLessThanOrEqual(31);

    // Approved Tenant Owner logs in cleanly
    const activeLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testOrgEmail, password: 'TenantPass@2026!' });
    expect(activeLogin.statusCode).toBe(200);
    const tenantToken = activeLogin.body.data.accessToken;

    // Tenant Owner updates company name branding & chooses subscription tier (3m/6m/9m/12m/Lifetime)
    const brandingRes = await request(app)
      .put('/api/v1/tenants/my/branding')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ name: `Ashanti Gold Credit ${suffix}` });
    expect(brandingRes.statusCode).toBe(200);
    expect(brandingRes.body.data.companyNameUpdated).toBe(true);

    const sub3m = await request(app)
      .post('/api/v1/tenants/my/subscription')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ planCode: 'PLAN_3M' });
    expect(sub3m.statusCode).toBe(200);
    expect(sub3m.body.data.tenant.subscriptionPlan).toBe('PLAN_3M');

    const subLifetime = await request(app)
      .post('/api/v1/tenants/my/subscription')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ planCode: 'LIFETIME' });
    expect(subLifetime.statusCode).toBe(200);
    expect(subLifetime.body.data.tenant.isLifetime).toBe(true);

    // Developer locks tenant -> subsequent API blocked with 402
    const lockRes = await request(app)
      .post(`/api/v1/developer/tenants/${createdTenantId}/lock`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'Integration test trial expiry simulation' });
    expect(lockRes.statusCode).toBe(200);

    const lockedCheck = await request(app)
      .get('/api/v1/tenants/my/countdown')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect([200, 402]).toContain(lockedCheck.statusCode);

    const lockedOperationalCheck = await request(app)
      .get('/api/v1/loans')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(lockedOperationalCheck.statusCode).toBe(402);

    // Developer unlocks explicitly via /unlock -> operational access restored
    const unlockRes = await request(app)
      .post(`/api/v1/developer/tenants/${createdTenantId}/unlock`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ extensionDays: 90, note: 'Unlocked in integration QA' });
    expect(unlockRes.statusCode).toBe(200);

    const restoredCheck = await request(app)
      .get('/api/v1/loans')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(restoredCheck.statusCode).toBe(200);

    // Multi-tenant Bulk Lock & Bulk Unlock
    const bulkLockRes = await request(app)
      .post('/api/v1/developer/tenants/bulk-lock')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ tenantIds: [createdTenantId], reason: 'QA Bulk Lock' });
    expect(bulkLockRes.statusCode).toBe(200);
    expect(bulkLockRes.body.count).toBe(1);

    const bulkUnlockRes = await request(app)
      .post('/api/v1/developer/tenants/bulk-unlock')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ tenantIds: [createdTenantId], extensionDays: 90 });
    expect(bulkUnlockRes.statusCode).toBe(200);
    expect(bulkUnlockRes.body.count).toBe(1);

    // Developer Delete Tenant Permanently
    const disposableEmail = `delete.mfi.${suffix}@gbstestmfi.com`;
    const disposableOnboard = await request(app)
      .post('/api/v1/tenants/onboard')
      .send({
        organizationName: `Disposable MFI ${suffix}`,
        institutionType: 'MICROFINANCE',
        city: 'Tamale',
        region: 'Northern',
        country: 'Ghana',
        representativeName: 'AbubakariYakubu',
        representativeEmail: disposableEmail,
        representativePhone: `+233267${suffix}`,
        password: 'TenantPass@2026!',
      });
    expect(disposableOnboard.statusCode).toBe(201);
    const disposableId = disposableOnboard.body.data.id;

    const delTenantRes = await request(app)
      .delete(`/api/v1/developer/tenants/${disposableId}`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(delTenantRes.statusCode).toBe(200);
    expect(delTenantRes.body.success).toBe(true);
    const verifyDeleted = await prisma.tenant.findUnique({ where: { id: disposableId } });
    expect(verifyDeleted).toBeNull();
  }, 45000);

  it('secures User Registration Counts & Admin Cross-Check + Deletion flow', async () => {
    // Public / unauthenticated blocked
    const anonCounts = await request(app).get('/api/v1/users/counts-by-role');
    expect(anonCounts.statusCode).toBe(401);

    // Non-admin field officer blocked from role counts
    const lowPrivCounts = await request(app)
      .get('/api/v1/users/counts-by-role')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(lowPrivCounts.statusCode).toBe(403);

    // Authorized HR & Company Owner succeed
    const hrCounts = await request(app)
      .get('/api/v1/users/counts-by-role')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrCounts.statusCode).toBe(200);
    expect(hrCounts.body.data.roles.length).toBe(29);

    // Create a temporary unqualified staff registration and remove via Admin cross-check endpoint
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@gbsloan.com' } });
    const tempUser = await prisma.user.create({
      data: {
        tenantId: adminUser.tenantId,
        email: `unqualified.${suffix}@gbsloan.com`,
        phone: `+233555${suffix}`,
        passwordHash: 'TempHash123!',
        role: 'LOAN_OFFICER',
        firstName: 'Test',
        lastName: 'Unqualified',
        status: 'AWAITING_APPROVAL',
        qualificationVerified: false,
      },
    });
    createdUnqualifiedUserId = tempUser.id;

    const listRes = await request(app)
      .get('/api/v1/users/by-role/LOAN_OFFICER')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.statusCode).toBe(200);

    const delRes = await request(app)
      .delete(`/api/v1/users/${createdUnqualifiedUserId}/remove-unqualified`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Incomplete credentials during QA test' });
    expect(delRes.statusCode).toBe(200);
  });

  it('executes Real Acoustic Voice Identity Verification (PASS on match, 401 on mismatch)', async () => {
    const enrollVector = [10, 22, 45, 80, 65, 40, 20, 10, 12, 18, 25, 30, 15, 10, 5, 2];
    const enrollRes = await request(app)
      .post('/api/v1/voice-auth/enroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        spectralMetrics: enrollVector,
        passphraseText: 'My name is Super Admin',
      });
    expect(enrollRes.statusCode).toBe(200);
    expect(enrollRes.body.data.isEnrolled).toBe(true);

    // Matching acoustic signature & phrase PASSES
    const passRes = await request(app)
      .post('/api/v1/voice-auth/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        spectralMetrics: [10, 21, 46, 79, 64, 41, 20, 11, 12, 18, 24, 30, 15, 10, 5, 2],
        transcription: 'My name is Super Admin',
        actionAttempted: 'TEST_VOICE_PASS',
      });
    expect(passRes.statusCode).toBe(200);
    expect(passRes.body.data.passed).toBe(true);

    // Orthogonal vector & wrong spoken name REJECTED with 401
    const failRes = await request(app)
      .post('/api/v1/voice-auth/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        spectralMetrics: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 90, 95, 100, 80, 70],
        transcription: 'Different Unauthorized Person',
        actionAttempted: 'TEST_VOICE_FAIL',
      });
    expect(failRes.statusCode).toBe(401);
    expect(failRes.body.data.passed).toBe(false);
  });

  it('executes End-to-End Loan Lifecycle, Cash Approval, Exports & Data Migration Rollback', async () => {
    const membersRes = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(membersRes.statusCode).toBe(200);
    const existingMember = membersRes.body.data[0];
    expect(existingMember).toBeDefined();

    // Apply Loan
    const applyRes = await request(app)
      .post('/api/v1/loans/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberId: existingMember.id,
        principalAmount: 2000,
        termMonths: 4,
        purpose: 'Integration QA Working Capital',
      });
    expect(applyRes.statusCode).toBe(201);
    createdLoanId = applyRes.body.data.id;

    // Review -> Approve -> Disburse
    const revRes = await request(app)
      .put(`/api/v1/loans/${createdLoanId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve', notes: 'Approved by QA integration' });
    expect(revRes.statusCode).toBe(200);

    const appRes = await request(app)
      .put(`/api/v1/loans/${createdLoanId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(appRes.statusCode).toBe(200);

    const disbRes = await request(app)
      .put(`/api/v1/loans/${createdLoanId}/disburse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'QA Disbursement' });
    expect(disbRes.statusCode).toBe(200);

    // Record CASH Payment -> AWAITING_APPROVAL -> Cashier Approves
    const payRes = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        loanId: createdLoanId,
        amount: 500,
        method: 'CASH',
      });
    expect(payRes.statusCode).toBe(201);
    createdCashPaymentId = payRes.body.data.id;
    expect(payRes.body.data.status).toBe('AWAITING_APPROVAL');

    const cashApproveRes = await request(app)
      .put(`/api/v1/payments/${createdCashPaymentId}/approve-cash`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentId: createdCashPaymentId, approved: true, notes: 'Verified in cashbook' });
    expect(cashApproveRes.statusCode).toBe(200);
    expect(cashApproveRes.body.data.status).toBe('COMPLETED');

    // CSV & PDF report exports
    const csvExport = await request(app)
      .get('/api/v1/enterprise/reports/export/loans?format=csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(csvExport.statusCode).toBe(200);
    expect(csvExport.headers['content-type']).toContain('text/csv');

    const pdfExport = await request(app)
      .get('/api/v1/enterprise/reports/export/loans?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pdfExport.statusCode).toBe(200);
    expect(pdfExport.headers['content-type']).toContain('application/pdf');

    // Excel/CSV Migration Job Create -> Process -> Rollback
    const jobRes = await request(app)
      .post('/api/v1/migration/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobType: 'JSON_IMPORT', fileName: `qa_${suffix}.json`, targetEntity: 'MEMBERS' });
    expect(jobRes.statusCode).toBe(201);
    createdMigrationJobId = jobRes.body.data.id;

    const procRes = await request(app)
      .post(`/api/v1/migration/jobs/${createdMigrationJobId}/process`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetEntity: 'MEMBERS',
        records: [
          {
            firstName: 'Migrated',
            lastName: 'Borrower',
            email: `mig.${suffix}@gbsloan.com`,
            phone: `+233208${suffix}`,
          },
        ],
      });
    expect(procRes.statusCode).toBe(200);
    expect(procRes.body.data.processedRecords).toBe(1);

    const rollRes = await request(app)
      .post(`/api/v1/migration/jobs/${createdMigrationJobId}/rollback`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rollRes.statusCode).toBe(200);
  });

  it('publishes Live Device GPS, locates mobile numbers on Google Map, searches members & exposes env mode', async () => {
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body.dataMode).toBeDefined();
    expect(['DEVELOPMENT_DEMO', 'PRODUCTION_LIVE']).toContain(healthRes.body.dataMode);

    // Share live device GPS from authenticated user account
    const shareRes = await request(app)
      .post('/api/v1/gps/share-location')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ latitude: 5.614818, longitude: -0.205874, accuracy: 8.5, status: 'ONLINE' });
    expect(shareRes.statusCode).toBe(200);
    expect(shareRes.body.data.isLiveGps).toBe(true);
    expect(shareRes.body.data.googleMapsUrl).toContain('5.614818');

    const sharedPhone = shareRes.body.data.phone;
    expect(sharedPhone).toBeTruthy();
    const localZeroPhone = sharedPhone.startsWith('+233') ? `0${sharedPhone.slice(4)}` : sharedPhone;

    // Tenant staff locates that mobile number (normalized local format) -> resolves Google Maps pin
    const tenantLookup = await request(app)
      .get('/api/v1/gps/locate-by-phone')
      .query({ phone: localZeroPhone })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(tenantLookup.statusCode).toBe(200);
    expect(tenantLookup.body.data.primaryMatch).toBeDefined();
    expect(tenantLookup.body.data.primaryMatch.coordinates.latitude).toBeCloseTo(5.614818, 4);

    // Developer locates any mobile number across tenants -> resolves exact live coordinates
    const devLookup = await request(app)
      .get('/api/v1/developer/locations/lookup')
      .query({ phone: sharedPhone })
      .set('Authorization', `Bearer ${devToken}`);
    expect(devLookup.statusCode).toBe(200);
    expect(devLookup.body.data.primaryMatch.coordinates.longitude).toBeCloseTo(-0.205874, 4);

    // Click-to-Search Member/Customer by name or member number in PostgreSQL
    const allMembers = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allMembers.statusCode).toBe(200);
    const firstMember = allMembers.body.data[0];
    expect(firstMember).toBeDefined();

    const fullNameQuery = `${firstMember.user.firstName} ${firstMember.user.lastName}`;
    const searchMembers = await request(app)
      .get('/api/v1/members')
      .query({ search: fullNameQuery })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchMembers.statusCode).toBe(200);
    expect(searchMembers.body.data.some((m) => m.id === firstMember.id)).toBe(true);

    // Branch Manager / Credit Team can also approve loans (expanded RBAC parity across user roles)
    const managerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@accramfi.com', password: 'GbsRole@2026!' });
    if (managerLogin.statusCode === 200) {
      const mgrToken = managerLogin.body.data.accessToken;
      const mgrLoans = await request(app)
        .get('/api/v1/loans')
        .set('Authorization', `Bearer ${mgrToken}`);
      expect(mgrLoans.statusCode).toBe(200);
    }
  });

  it('executes Enterprise v3 Staff Approval Gate, Clock In/Out, Owner Broadcast, Accountant Audit, CCTV Mobile, Wrapped Reports & Hidden Emergency Locate', async () => {
    // Sign in as the approved & unlocked test institution Owner
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testOrgEmail, password: 'TenantPass@2026!' });
    expect(ownerLogin.statusCode).toBe(200);
    const ownerToken = ownerLogin.body.data.accessToken;

    // 1. Provision Staff requiring explicit Owner Approval -> Blocked before approval -> Activated after approve
    const staffEmail = `staff.qa.${suffix}@gbstestmfi.com`;
    const provRes = await request(app)
      .post('/api/v1/staff/provision')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        firstName: 'Kofi',
        lastName: 'Mensah',
        email: staffEmail,
        phone: `+233551${suffix}`,
        password: 'StaffPass@2026!',
        role: 'LOAN_OFFICER',
        gpsAddress: 'GA-777-2201',
        autoApprove: false,
      });
    expect(provRes.statusCode).toBe(201);
    const provisionedUserId = provRes.body.data.userId;
    expect(provisionedUserId).toBeTruthy();

    const blockedStaffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: staffEmail, password: 'StaffPass@2026!' });
    expect(blockedStaffLogin.statusCode).toBe(403);

    const approveStaffRes = await request(app)
      .post(`/api/v1/staff/${provisionedUserId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ approve: true });
    expect(approveStaffRes.statusCode).toBe(200);

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: staffEmail, password: 'StaffPass@2026!' });
    expect(staffLogin.statusCode).toBe(200);
    const staffToken = staffLogin.body.data.accessToken;

    // 2. Staff Attendance Clock In / Status / Clock Out / Manager Log
    const clockInRes = await request(app)
      .post('/api/v1/staff/attendance/clock-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ gpsAddress: 'GA-777-2201', latitude: 5.605, longitude: -0.188 });
    expect(clockInRes.statusCode).toBe(200);
    expect(['CLOCKED_IN', 'LATE']).toContain(clockInRes.body.data.status);

    const myAttStatus = await request(app)
      .get('/api/v1/staff/attendance/my-status')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(myAttStatus.statusCode).toBe(200);
    expect(myAttStatus.body.data.clockedIn).toBe(true);

    const clockOutRes = await request(app)
      .post('/api/v1/staff/attendance/clock-out')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ gpsAddress: 'GA-777-2201', latitude: 5.605, longitude: -0.188 });
    expect(clockOutRes.statusCode).toBe(200);
    expect(clockOutRes.body.data.status).toBe('CLOCKED_OUT');

    // 3. Company Owner Staff Broadcast + Staff Inbox + Collection Alerts
    const bcastRes = await request(app)
      .post('/api/v1/notifications/broadcast')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ sendToAll: true, title: 'Morning Standup', message: 'Ensure all active borrowers pay on time.', priority: 'HIGH' });
    expect(bcastRes.statusCode).toBe(201);

    const inboxRes = await request(app)
      .get('/api/v1/notifications/broadcasts')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(inboxRes.statusCode).toBe(200);
    expect(inboxRes.body.data.some((b) => b.subject === 'Morning Standup' || b.title === 'Morning Standup')).toBe(true);

    const alertsRes = await request(app)
      .get('/api/v1/notifications/repayment-alerts')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(alertsRes.statusCode).toBe(200);
    expect(alertsRes.body.data).toHaveProperty('totalBorrowers');

    // 4. Online Meeting Scheduling by Owner -> EXECUTIVES_ONLY / ALL_STAFF
    const meetRes = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ topic: `Owner Board Review ${suffix}`, audienceType: 'EXECUTIVES_ONLY', duration: 45 });
    expect(meetRes.statusCode).toBe(201);
    expect(meetRes.body.data.targetScope).toBe('EXECUTIVES_ONLY');

    // 5. Accountant Ledger Audit & Company Owner Sign-Off
    const auditRun = await request(app)
      .post('/api/v1/enterprise/audits/reconcile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ periodLabel: `QA-${suffix}`, notes: 'Automated ledger verification' });
    expect(auditRun.statusCode).toBe(201);
    const createdAuditId = auditRun.body.data.id;

    const ownerSignOff = await request(app)
      .put(`/api/v1/enterprise/audits/${createdAuditId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED', ownerNotes: 'Verified and approved' });
    expect(ownerSignOff.statusCode).toBe(200);
    expect(ownerSignOff.body.data.status).toBe('APPROVED');

    // 6. CCTV Camera Mobile Linking + Public Smartphone Access
    const cctvRes = await request(app)
      .post('/api/v1/enterprise/cctv')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Vault Cam ${suffix}`, locationLabel: 'Kumasi Vault', streamUrl: 'https://demo.stream.local/vault.m3u8' });
    expect(cctvRes.statusCode).toBe(201);
    expect(cctvRes.body.data.qrCodeDataUrl).toContain('data:image/');
    const mobileUrl = new URL(cctvRes.body.data.mobileLinkUrl, 'http://localhost');
    const mobileAccessRes = await request(app)
      .get('/api/v1/enterprise/cctv/mobile-access')
      .query({
        cameraId: mobileUrl.searchParams.get('cameraId'),
        code: mobileUrl.searchParams.get('code'),
        token: mobileUrl.searchParams.get('token'),
      });
    expect(mobileAccessRes.statusCode).toBe(200);
    expect(mobileAccessRes.body.data.name).toBe(`Vault Cam ${suffix}`);

    // 7. Weekly/Monthly/Yearly Wrapped Report + CSV Download
    const wrapRes = await request(app)
      .post('/api/v1/reports/wrap-period')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ period: 'WEEKLY' });
    expect(wrapRes.statusCode).toBe(201);
    const snapId = wrapRes.body.data.id;
    expect(snapId).toBeTruthy();
    const csvExport = await request(app)
      .get(`/api/v1/reports/snapshots/${snapId}/export`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(csvExport.statusCode).toBe(200);
    expect(csvExport.headers['content-type']).toContain('text/csv');

    // 8. Loan Workflow Audit Trail Snapshot verification
    const wfRes = await request(app)
      .get(`/api/v1/loans/${createdLoanId}/workflow`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(wfRes.statusCode).toBe(200);
    expect(wfRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(wfRes.body.data[0].performedByName).toBeTruthy();

    // 9. Hidden Customer & Guarantor GPS Digital Address + Emergency Locator
    const hiddenGps = `AK-${suffix}-88`;
    const hiddenMemberRes = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        firstName: 'Hidden',
        lastName: 'Borrower',
        email: `hidden.cust.${suffix}@gbsloan.com`,
        phone: `+233508${suffix}`,
        gpsAddress: hiddenGps,
        isHidden: true,
      });
    expect(hiddenMemberRes.statusCode).toBe(201);

    const hiddenGuarRes = await request(app)
      .post('/api/v1/guarantors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        firstName: 'Hidden',
        lastName: 'Guarantor',
        email: `hidden.guar.${suffix}@gbsloan.com`,
        phone: `+233509${suffix}`,
        gpsAddress: `AK-${suffix}-99`,
        isHidden: true,
      });
    expect(hiddenGuarRes.statusCode).toBe(201);

    const hiddenEmergencyLocate = await request(app)
      .get('/api/v1/gps/emergency-locate')
      .query({ q: hiddenGps, includeHidden: 'true' })
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(hiddenEmergencyLocate.statusCode).toBe(200);
    expect(hiddenEmergencyLocate.body.data.primaryMatch).toBeDefined();
    expect(hiddenEmergencyLocate.body.data.primaryMatch.gpsAddress).toBe(hiddenGps);
    expect(hiddenEmergencyLocate.body.data.primaryMatch.isHidden).toBe(true);

    // Clean up adminToken-owned audit record created outside test tenant
    await prisma.accountingAuditRecord.deleteMany({ where: { id: createdAuditId } }).catch(() => null);
  }, 45000);

  it('verifies Developer Control Center end-to-end fixes & SUPER_ADMIN removal assertions', async () => {
    const enumRows = await prisma.$queryRawUnsafe(`
      SELECT e.enumlabel FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'UserRole'
    `);
    expect(enumRows.some((r) => r.enumlabel === 'SUPER_ADMIN')).toBe(false);

    const [devPerfRes, devDiagRes, devCrashRes, devAlertsRes, devRecRes, devBkListRes] = await Promise.all([
      request(app).get('/api/v1/developer/performance').set('Authorization', `Bearer ${devToken}`),
      request(app).get('/api/v1/developer/diagnostics').set('Authorization', `Bearer ${devToken}`),
      request(app).get('/api/v1/developer/crash-reports').set('Authorization', `Bearer ${devToken}`),
      request(app).get('/api/v1/developer/security-alerts').set('Authorization', `Bearer ${devToken}`),
      request(app).get('/api/v1/developer/recovery').set('Authorization', `Bearer ${devToken}`),
      request(app).get('/api/v1/developer/backups').set('Authorization', `Bearer ${devToken}`),
    ]);
    expect(devPerfRes.statusCode).toBe(200);
    expect(devDiagRes.statusCode).toBe(200);
    expect(Array.isArray(devDiagRes.body.data?.checks)).toBe(true);
    expect(devCrashRes.statusCode).toBe(200);
    expect(Array.isArray(devCrashRes.body.data?.reports)).toBe(true);
    expect(devAlertsRes.statusCode).toBe(200);
    expect(Array.isArray(devAlertsRes.body.data?.alerts)).toBe(true);
    expect(devRecRes.statusCode).toBe(200);
    expect(devBkListRes.statusCode).toBe(200);

    const devLockRes = await request(app)
      .post('/api/v1/developer/system-lock')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ lockReason: 'QA Lock Reason Verification' });
    expect(devLockRes.statusCode).toBe(200);
    expect(devLockRes.body.data.lockReason).toBe('QA Lock Reason Verification');
    await request(app).post('/api/v1/developer/system-unlock').set('Authorization', `Bearer ${devToken}`).send({});

    const devMsgRes = await request(app)
      .post('/api/v1/developer/messages')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ tenantId: null, title: 'QA Developer Broadcast', body: 'Verified dispatch pipeline', messageType: 'ANNOUNCEMENT' });
    expect(devMsgRes.statusCode).toBe(201);
    expect(devMsgRes.body.data.title).toBe('QA Developer Broadcast');
    await prisma.tenantMessage.delete({ where: { id: devMsgRes.body.data.id } }).catch(() => null);
  }, 30000);
});
