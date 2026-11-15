const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { prisma } = require('../../config/database');
const salaryGroupingService = require('../human-resources/services/salaryGrouping.service');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * GBS Enterprise Domain Service — Real PostgreSQL Operations for all 30 Role Dashboards
 */
class EnterpriseService {
  // 1. Loan Products
  async getLoanProducts(tenantId) {
    return prisma.loanProduct.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLoanProduct(data, tenantId) {
    return prisma.loanProduct.create({
      data: {
        tenantId: tenantId || data.tenantId || null,
        code: data.code || `LP-${Date.now().toString().slice(-6)}`,
        name: data.name,
        category: data.category || 'MICRO_LOAN',
        minAmount: parseFloat(data.minAmount || 500),
        maxAmount: parseFloat(data.maxAmount || 250000),
        interestRate: parseFloat(data.interestRate || 15.0),
        penaltyRate: parseFloat(data.penaltyRate || 5.0),
        minTermMonths: parseInt(data.minTermMonths || 3, 10),
        maxTermMonths: parseInt(data.maxTermMonths || 36, 10),
      },
    });
  }

  // 2. Collateral Items
  async getCollaterals(tenantId) {
    return prisma.collateralItem.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { loan: { select: { loanNumber: true, principalAmount: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollateral(data, tenantId, userId) {
    if (!data.loanId || !data.title || !data.estimatedValue) {
      throw new ValidationError('loanId, title, and estimatedValue are required for collateral');
    }
    return prisma.collateralItem.create({
      data: {
        tenantId: tenantId || null,
        loanId: data.loanId,
        title: data.title,
        assetType: data.assetType || 'PROPERTY',
        estimatedValue: parseFloat(data.estimatedValue),
        documentRef: data.documentRef || null,
        status: 'VERIFIED',
        verifiedById: userId || null,
      },
    });
  }

  // 3. Field Customer Visits
  async getCustomerVisits(tenantId) {
    return prisma.customerVisit.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        collector: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { visitedAt: 'desc' },
      take: 100,
    });
  }

  async recordCustomerVisit(data, userId, tenantId) {
    let collectorId = data.collectorId;
    if (!collectorId && userId) {
      const col = await prisma.collector.findUnique({ where: { userId } });
      if (col) collectorId = col.id;
    }
    if (!collectorId) {
      const firstCol = await prisma.collector.findFirst({ where: tenantId ? { tenantId } : undefined });
      if (firstCol) {
        collectorId = firstCol.id;
      } else if (userId) {
        const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { branchId: true, tenantId: true } });
        const createdCol = await prisma.collector.create({
          data: {
            tenantId: tenantId || userRecord?.tenantId || null,
            branchId: userRecord?.branchId || null,
            userId,
            employeeId: `COL-${Date.now().toString().slice(-6)}`,
            assignedZone: 'General Field Operations',
            status: 'ON_ROUTE',
            isActive: true,
          },
        });
        collectorId = createdCol.id;
      } else {
        throw new ValidationError('Active collector profile required to log field visit');
      }
    }

    return prisma.customerVisit.create({
      data: {
        tenantId: tenantId || null,
        collectorId,
        customerName: data.customerName,
        loanNumber: data.loanNumber || null,
        visitOutcome: data.visitOutcome || 'COLLECTED',
        amountCollected: parseFloat(data.amountCollected || 0),
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        notes: data.notes || null,
      },
    });
  }

  // 4. Compliance / Risk / Fraud / Legal / Audit Cases
  async getComplianceCases(tenantId, category = null) {
    return prisma.complianceCase.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createComplianceCase(data, tenantId, userId) {
    return prisma.complianceCase.create({
      data: {
        tenantId: tenantId || null,
        caseCode: data.caseCode || `CMP-${Date.now().toString().slice(-6)}`,
        category: data.category || data.caseType || 'COMPLIANCE',
        severity: data.severity || 'MEDIUM',
        title: data.title,
        description: data.description,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        assignedToId: userId || null,
      },
    });
  }

  async updateComplianceCase(id, data) {
    return prisma.complianceCase.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.severity ? { severity: data.severity } : {}),
        ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
      },
    });
  }

  // 5. Customer Service & Reception Support Tickets
  async getSupportTickets(tenantId) {
    return prisma.supportTicket.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupportTicket(data, tenantId, userId) {
    return prisma.supportTicket.create({
      data: {
        tenantId: tenantId || null,
        ticketNumber: data.ticketNumber || `TKT-${Date.now().toString().slice(-6)}`,
        requesterName: data.requesterName || 'Walk-In Customer',
        requesterPhone: data.requesterPhone || null,
        channel: data.channel || data.category || 'WALK_IN',
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'NORMAL',
        assignedToId: userId || null,
      },
    });
  }

  async updateSupportTicket(id, data) {
    return prisma.supportTicket.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
      },
    });
  }

  // 6. Investor Portfolio
  async getInvestors(tenantId) {
    return prisma.investorAccount.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvestor(data, tenantId) {
    const capital = parseFloat(data.committedCapital ?? data.investedAmount ?? 0);
    return prisma.investorAccount.create({
      data: {
        tenantId: tenantId || null,
        investorCode: data.investorCode || `INV-${Date.now().toString().slice(-5)}`,
        investorName: data.investorName,
        email: data.email || null,
        committedCapital: capital,
        deployedCapital: parseFloat(data.deployedCapital ?? capital),
        annualYieldRate: parseFloat(data.annualYieldRate ?? data.interestRate ?? 18.5),
        returnsAccrued: parseFloat(data.returnsAccrued || 0),
      },
    });
  }

  // 7. Marketing Campaigns
  async getCampaigns(tenantId) {
    return prisma.marketingCampaign.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(data, tenantId) {
    return prisma.marketingCampaign.create({
      data: {
        tenantId: tenantId || null,
        campaignCode: data.campaignCode || `MKT-${Date.now().toString().slice(-5)}`,
        name: data.name,
        channel: data.channel || 'SMS_OUTREACH',
        targetSegment: data.targetSegment || null,
        leadsCount: parseInt(data.leadsCount ?? data.reachCount ?? 0, 10),
        conversions: parseInt(data.conversions || 0, 10),
        budget: parseFloat(data.budget || 0),
      },
    });
  }

  // 8. Documents Vault
  async getDocuments(tenantId) {
    return prisma.documentRecord.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(data, file, tenantId, userId) {
    return prisma.documentRecord.create({
      data: {
        tenantId: tenantId || null,
        entityType: data.entityType || 'TENANT',
        entityId: data.entityId || tenantId || 'GENERAL',
        title: data.title || file?.originalname || 'Uploaded Document',
        category: data.category || 'KYC',
        filePath: file ? `/uploads/${file.filename}` : (data.filePath || '/uploads/record.pdf'),
        mimeType: file?.mimetype || data.mimeType || 'application/pdf',
        fileSize: file?.size || 0,
        uploadedById: userId || null,
        verified: Boolean(data.verified),
      },
    });
  }

  // 9. Manager Deletion Approval Queue
  async getDeletionRequests(tenantId) {
    return prisma.deletionApprovalRequest.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewDeletionRequest(id, action, reviewerId, notes) {
    const reqRecord = await prisma.deletionApprovalRequest.findUnique({ where: { id } });
    if (!reqRecord) throw new NotFoundError('Deletion approval request');

    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    if (status === 'APPROVED' && reqRecord.entityType === 'MEMBER') {
      const memberService = require('../../services/member.service');
      await memberService.approveMemberDeletion(reqRecord.entityId, reviewerId, reqRecord.tenantId);
    } else if (status === 'REJECTED' && reqRecord.entityType === 'MEMBER') {
      const memberService = require('../../services/member.service');
      await memberService.rejectMemberDeletion(reqRecord.entityId, reviewerId, reqRecord.tenantId);
    }

    return prisma.deletionApprovalRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: reviewerId || null,
        reviewNotes: notes || `Reviewed: ${status}`,
        reviewedAt: new Date(),
      },
    });
  }

  // 10. Automated HR Payroll Generation using Grade/Step/Band Matrix
  async generateMonthlyPayroll(tenantId, month, year) {
    const now = new Date();
    const targetMonth = parseInt(month || (now.getMonth() + 1), 10);
    const targetYear = parseInt(year || now.getFullYear(), 10);

    const staffList = await prisma.staff.findMany({
      where: { isActive: true, ...(tenantId ? { tenantId } : {}) },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const created = [];
    for (const s of staffList) {
      const existing = await prisma.staffSalary.findFirst({
        where: { staffId: s.id, month: targetMonth, year: targetYear },
      });
      if (existing) continue;

      const calc = await salaryGroupingService.calculateEmployeeSalary(s.id).catch(() => null);
      const baseAmount = calc ? Number(calc.grossSalary || s.baseSalary) : Number(s.baseSalary);
      const bonuses = calc ? Number(calc.qualificationAllowance || 0) : 0;
      const deductions = Number((baseAmount * 0.055).toFixed(2));
      const netAmount = Number((baseAmount + bonuses - deductions).toFixed(2));

      const row = await prisma.staffSalary.create({
        data: {
          staffId: s.id,
          month: targetMonth,
          year: targetYear,
          baseAmount,
          bonuses,
          deductions,
          netAmount,
          status: 'PENDING',
          notes: calc ? `Grade ${calc.gradeCode} Step ${calc.stepNumber} Payroll` : 'Standard Base Payroll',
        },
      });
      created.push(row);
    }
    return { month: targetMonth, year: targetYear, generatedCount: created.length, records: created };
  }

  // 11. Real PostgreSQL Report Export Engine (CSV, Excel .xlsx, PDF via PDFKit)
  async exportReport(type, format = 'csv', tenantId = null) {
    const cleanType = String(type || 'loans').toLowerCase();
    const cleanFormat = String(format || 'csv').toLowerCase();
    let rows = [];
    let title = 'GBS Loan System Report';

    if (cleanType === 'loans') {
      title = 'GBS Loan Portfolio Report';
      const loans = await prisma.loan.findMany({
        where: tenantId ? { tenantId } : undefined,
        include: { member: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      rows = loans.map((l) => ({
        LoanNumber: l.loanNumber,
        Borrower: `${l.member?.user?.firstName || ''} ${l.member?.user?.lastName || ''}`.trim(),
        PrincipalGHS: Number(l.principalAmount),
        TotalAmountGHS: Number(l.totalAmount),
        PaidGHS: Number(l.amountPaid),
        OutstandingGHS: Number(l.outstandingAmount),
        Status: l.status,
        AppliedAt: l.applicationDate.toISOString().split('T')[0],
      }));
    } else if (cleanType === 'payments') {
      title = 'GBS Collections & Payments Report';
      const payments = await prisma.payment.findMany({
        where: tenantId ? { tenantId } : undefined,
        include: { loan: { select: { loanNumber: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      rows = payments.map((p) => ({
        PaymentRef: p.paymentRef,
        LoanNumber: p.loan?.loanNumber || 'N/A',
        AmountGHS: Number(p.amount),
        Method: p.method,
        Status: p.status,
        Receipt: p.receiptNumber || '',
        Date: (p.paidAt || p.createdAt).toISOString().split('T')[0],
      }));
    } else if (cleanType === 'members') {
      title = 'GBS Registered Members Report';
      const members = await prisma.member.findMany({
        where: tenantId ? { tenantId } : undefined,
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      rows = members.map((m) => ({
        MemberNumber: m.memberNumber,
        Name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim(),
        Email: m.user?.email || '',
        Phone: m.user?.phone || '',
        GhanaCard: m.ghanaCardNumber || 'Pending',
        Status: m.user?.status || 'ACTIVE',
      }));
    } else {
      title = 'GBS Audit Trail Report';
      const logs = await prisma.auditLog.findMany({
        where: tenantId ? { tenantId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
      rows = logs.map((a) => ({
        Action: a.action,
        Entity: a.entityType,
        EntityId: a.entityId || '',
        IP: a.ipAddress || '',
        Timestamp: a.createdAt.toISOString(),
      }));
    }

    if (cleanFormat === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'No records available' }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        filename: `gbs-${cleanType}-report.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    if (cleanFormat === 'pdf') {
      const buffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 36, size: 'A4' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(16).text(title, { bold: true });
        doc.fontSize(9).fillColor('#555').text(`Generated: ${new Date().toISOString()} | Total Rows: ${rows.length}`);
        doc.moveDown();

        rows.slice(0, 80).forEach((row, idx) => {
          const line = `${idx + 1}. ` + Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ');
          doc.fontSize(8).fillColor('#111').text(line);
        });
        doc.end();
      });
      return {
        buffer,
        filename: `gbs-${cleanType}-report.pdf`,
        contentType: 'application/pdf',
      };
    }

    const headers = rows.length ? Object.keys(rows[0]) : ['Message'];
    const csvLines = [headers.join(',')];
    for (const r of (rows.length ? rows : [{ Message: 'No records found' }])) {
      csvLines.push(headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
    }
    return {
      buffer: Buffer.from(csvLines.join('\n'), 'utf8'),
      filename: `gbs-${cleanType}-report.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }
}

module.exports = new EnterpriseService();

