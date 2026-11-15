const { prisma } = require('../../config/database');
const { NotFoundError, AuthorizationError, ValidationError } = require('../../utils/errors');

const toCents = (val) => Math.round(Number(val || 0) * 100);
const fromCents = (cents) => Math.round(Number(cents || 0)) / 100;

function formatAuditRecord(record) {
  let parsedFindings = { summary: {}, items: [] };
  if (record.findings) {
    try {
      parsedFindings = JSON.parse(record.findings);
    } catch {
      parsedFindings = { summary: {}, items: [{ severity: 'INFO', code: 'NOTE', message: record.findings }] };
    }
  }

  return {
    ...record,
    auditRef: parsedFindings?.summary?.auditRef || `AUD-${record.id.slice(0, 8).toUpperCase()}`,
    periodLabel: record.auditPeriod,
    auditedByName: record.auditorName,
    totalDisbursed: Number(record.totalPrincipalDisbursed || 0),
    totalPrincipalDisbursed: Number(record.totalPrincipalDisbursed || 0),
    totalInterestExpected: Number(record.totalInterestExpected || 0),
    totalCollected: Number(record.totalRepaid || 0),
    totalRepaid: Number(record.totalRepaid || 0),
    totalOutstanding: Number(record.totalOutstanding || 0),
    totalPenalties: Number(record.totalPenalties || 0),
    cashInHand: Number(record.cashInHand || 0),
    momoFloat: Number(record.momoFloat || 0),
    bankBalance: Number(record.bankBalance || 0),
    expectedLedgerTotal: Number(record.expectedLedgerTotal || 0),
    actualLedgerTotal: Number(record.actualLedgerTotal || 0),
    discrepancyAmount: Number(record.variance || 0),
    variance: Number(record.variance || 0),
    netCashPosition: Number(record.actualLedgerTotal || 0),
    totalPendingCash: Number(parsedFindings?.summary?.pendingCashAmountGhs || 0),
    totalSalariesPaid: Number(parsedFindings?.summary?.salariesPaidGhs || 0),
    parsedFindings,
    findingsSummary: parsedFindings?.summary || {},
    findingItems: Array.isArray(parsedFindings?.items) ? parsedFindings.items : [],
  };
}

/**
 * Accountant Audit & Ledger Reconciliation Service
 * Uses integer-pesewa precision to verify loan principal, interest, repayments,
 * cash approvals, payroll payouts, penalties, and investor capital for Company Owner sign-off.
 */
class AccountingAuditService {
  async runLedgerReconciliation(tenantId, accountantUser, { periodLabel, notes = '' } = {}) {
    if (!tenantId) throw new ValidationError('Active tenant context is required for ledger auditing.');

    const label = String(periodLabel || new Date().toISOString().slice(0, 7)).trim();
    const auditorName = `${accountantUser.firstName || ''} ${accountantUser.lastName || ''}`.trim() || accountantUser.email;

    const [loans, payments, salaries, investors, penaltiesAgg, customerCount] = await Promise.all([
      prisma.loan.findMany({
        where: { tenantId },
        select: {
          id: true,
          loanNumber: true,
          principalAmount: true,
          totalAmount: true,
          amountPaid: true,
          outstandingAmount: true,
          status: true,
          payments: {
            where: { status: 'COMPLETED' },
            select: { amount: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: { tenantId },
        select: { id: true, amount: true, status: true, method: true },
      }),
      prisma.staffSalary.findMany({
        where: { tenantId, status: 'PAID' },
        select: { netAmount: true },
      }),
      prisma.investorAccount.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: { committedCapital: true },
      }),
      prisma.loanPenalty.aggregate({
        where: { loan: { tenantId } },
        _sum: { amount: true },
      }),
      prisma.member.count({ where: { tenantId, deletedAt: null } }),
    ]);

    let disbursedCents = 0;
    let totalExpectedCents = 0;
    let outstandingCents = 0;
    let loanRecordedPaidCents = 0;
    let paymentDerivedPaidCents = 0;
    const findings = [];

    for (const loan of loans) {
      if (['DISBURSED', 'ONGOING', 'PAID', 'OVERDUE', 'DEFAULTED', 'CLOSED'].includes(loan.status)) {
        disbursedCents += toCents(loan.principalAmount);
        totalExpectedCents += toCents(loan.totalAmount);
      }
      if (['DISBURSED', 'ONGOING', 'OVERDUE', 'DEFAULTED'].includes(loan.status)) {
        outstandingCents += toCents(loan.outstandingAmount);
      }

      const recordedPaid = toCents(loan.amountPaid);
      const summedCompleted = loan.payments.reduce((acc, p) => acc + toCents(p.amount), 0);
      loanRecordedPaidCents += recordedPaid;
      paymentDerivedPaidCents += summedCompleted;

      const ledgerDiff = recordedPaid - summedCompleted;
      if (Math.abs(ledgerDiff) > 1) {
        findings.push({
          severity: 'HIGH',
          code: 'LOAN_PAYMENT_MISMATCH',
          loanNumber: loan.loanNumber,
          loanId: loan.id,
          recordedPaid: fromCents(recordedPaid),
          completedPaymentsSum: fromCents(summedCompleted),
          varianceGhs: fromCents(ledgerDiff),
          message: `Loan ${loan.loanNumber} recordedPaid (GHS ${fromCents(recordedPaid)}) differs from completed payments (GHS ${fromCents(summedCompleted)}).`,
        });
      }

      const computedOutstanding = Math.max(0, toCents(loan.totalAmount) - summedCompleted);
      const storedOutstanding = toCents(loan.outstandingAmount);
      if (Math.abs(computedOutstanding - storedOutstanding) > 1 && ['DISBURSED', 'ONGOING', 'OVERDUE'].includes(loan.status)) {
        findings.push({
          severity: 'MEDIUM',
          code: 'OUTSTANDING_BALANCE_DRIFT',
          loanNumber: loan.loanNumber,
          loanId: loan.id,
          storedOutstanding: fromCents(storedOutstanding),
          recomputedOutstanding: fromCents(computedOutstanding),
          varianceGhs: fromCents(storedOutstanding - computedOutstanding),
          message: `Loan ${loan.loanNumber} outstanding drift detected: stored GHS ${fromCents(storedOutstanding)} vs recomputed GHS ${fromCents(computedOutstanding)}.`,
        });
      }
    }

    let collectedCents = 0;
    let cashInHandCents = 0;
    let momoFloatCents = 0;
    let bankBalanceCents = 0;
    let pendingCashCents = 0;
    let pendingCashCount = 0;

    for (const p of payments) {
      const amtCents = toCents(p.amount);
      if (p.status === 'COMPLETED') {
        collectedCents += amtCents;
        if (p.method === 'CASH') cashInHandCents += amtCents;
        else if (p.method === 'MOMO') momoFloatCents += amtCents;
        else bankBalanceCents += amtCents;
      } else if (['PENDING', 'AWAITING_APPROVAL'].includes(p.status) && p.method === 'CASH') {
        pendingCashCents += amtCents;
        pendingCashCount += 1;
      }
    }

    if (pendingCashCount > 0) {
      findings.push({
        severity: 'MEDIUM',
        code: 'UNRECONCILED_CASH_PAYMENTS',
        count: pendingCashCount,
        amountGhs: fromCents(pendingCashCents),
        message: `${pendingCashCount} cash repayment(s) totalling GHS ${fromCents(pendingCashCents)} await Finance/Accountant approval.`,
      });
    }

    const totalInterestCents = Math.max(0, totalExpectedCents - disbursedCents);
    const totalPenaltiesCents = toCents(penaltiesAgg?._sum?.amount);
    const salariesPaidCents = salaries.reduce((acc, s) => acc + toCents(s.netAmount), 0);
    const investorCapitalCents = investors.reduce((acc, i) => acc + toCents(i.committedCapital), 0);
    const netCashPositionCents = investorCapitalCents + collectedCents - disbursedCents - salariesPaidCents;
    const discrepancyCents = Math.abs(loanRecordedPaidCents - paymentDerivedPaidCents);

    if (discrepancyCents === 0 && findings.length === 0) {
      findings.push({
        severity: 'INFO',
        code: 'LEDGER_BALANCED',
        message: `All ${loans.length} loans, ${payments.length} payment transactions, and ${customerCount} customer accounts balanced at exact pesewa precision.`,
      });
    }

    const status = discrepancyCents > 0 || findings.some((f) => f.severity === 'HIGH') ? 'FLAGGED' : 'SUBMITTED';
    const auditRef = `AUD-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;

    const structuredFindings = {
      summary: {
        auditRef,
        totalRegisteredCustomers: customerCount,
        totalLoansAudited: loans.length,
        totalPaymentsAudited: payments.length,
        totalExpectedRepayableGhs: fromCents(totalExpectedCents),
        investorCapitalGhs: fromCents(investorCapitalCents),
        salariesPaidGhs: fromCents(salariesPaidCents),
        pendingCashCount,
        pendingCashAmountGhs: fromCents(pendingCashCents),
      },
      items: findings,
    };

    const record = await prisma.accountingAuditRecord.create({
      data: {
        tenantId,
        auditorId: accountantUser.id,
        auditorName,
        auditPeriod: label,
        totalPrincipalDisbursed: fromCents(disbursedCents),
        totalInterestExpected: fromCents(totalInterestCents),
        totalRepaid: fromCents(collectedCents),
        totalOutstanding: fromCents(outstandingCents),
        totalPenalties: fromCents(totalPenaltiesCents),
        cashInHand: fromCents(cashInHandCents),
        momoFloat: fromCents(momoFloatCents),
        bankBalance: fromCents(bankBalanceCents),
        expectedLedgerTotal: fromCents(loanRecordedPaidCents),
        actualLedgerTotal: fromCents(netCashPositionCents),
        variance: fromCents(discrepancyCents),
        discrepanciesFound: findings.filter((f) => f.severity !== 'INFO').length,
        status,
        findings: JSON.stringify(structuredFindings),
        submittedToOwner: true,
        ownerNotes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: accountantUser.id,
        action: 'CREATE',
        entityType: 'AccountingAuditRecord',
        entityId: record.id,
        newValues: {
          auditRef,
          tenantId,
          auditPeriod: label,
          totalPrincipalDisbursed: fromCents(disbursedCents),
          totalRepaid: fromCents(collectedCents),
          netCashPosition: fromCents(netCashPositionCents),
          variance: fromCents(discrepancyCents),
          status,
        },
      },
    }).catch(() => { });

    return formatAuditRecord(record);
  }

  async listAudits(tenantId) {
    if (!tenantId) return { records: [], liveSummary: null };

    const [records, customerCount, pendingCashAgg, completedPaymentsAgg, disbursedAgg] = await Promise.all([
      prisma.accountingAuditRecord.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.member.count({ where: { tenantId, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { tenantId, status: { in: ['PENDING', 'AWAITING_APPROVAL'] }, method: 'CASH' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.loan.aggregate({
        where: { tenantId, status: { in: ['DISBURSED', 'ONGOING', 'PAID', 'OVERDUE', 'DEFAULTED', 'CLOSED'] } },
        _sum: { principalAmount: true },
      }),
    ]);

    return {
      records: records.map(formatAuditRecord),
      liveSummary: {
        totalRegisteredCustomers: customerCount,
        pendingCashApprovals: pendingCashAgg._count.id || 0,
        pendingCashAmountGhs: fromCents(toCents(pendingCashAgg._sum.amount)),
        totalCollectedGhs: fromCents(toCents(completedPaymentsAgg._sum.amount)),
        totalDisbursedGhs: fromCents(toCents(disbursedAgg._sum.principalAmount)),
      },
    };
  }

  async reviewAudit(auditId, ownerUser, { action = 'APPROVE', reviewNotes = '' } = {}) {
    const allowedRoles = ['COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT'];
    if (!allowedRoles.includes(String(ownerUser.role || '').toUpperCase())) {
      throw new AuthorizationError('Only Company Owner or Executive Management can sign off accounting audits.');
    }

    const existing = await prisma.accountingAuditRecord.findUnique({ where: { id: auditId } });
    if (!existing) throw new NotFoundError('Accounting Audit Record');
    if (ownerUser.tenantId && existing.tenantId !== ownerUser.tenantId) {
      throw new AuthorizationError('Cross-tenant audit review denied.');
    }

    const reviewerName = `${ownerUser.firstName || ''} ${ownerUser.lastName || ''}`.trim() || ownerUser.email;
    const isReject = ['REJECT', 'REVISION_REQUIRED'].includes(String(action).toUpperCase());
    const nextStatus = isReject ? 'REVISION_REQUIRED' : 'APPROVED';
    const stampedNote = `[${reviewerName} Sign-Off]: ${reviewNotes || nextStatus}`;
    const updatedNotes = existing.ownerNotes ? `${existing.ownerNotes}\n${stampedNote}` : stampedNote;

    const updated = await prisma.accountingAuditRecord.update({
      where: { id: auditId },
      data: {
        status: nextStatus,
        ownerReviewedAt: new Date(),
        ownerNotes: updatedNotes,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: existing.tenantId || ownerUser.tenantId || null,
        userId: ownerUser.id,
        action: isReject ? 'REJECT' : 'APPROVE',
        entityType: 'AccountingAuditRecord',
        entityId: updated.id,
        oldValues: { status: existing.status },
        newValues: { status: nextStatus, reviewedByName: reviewerName, reviewNotes },
      },
    }).catch(() => { });

    return formatAuditRecord(updated);
  }
}

module.exports = new AccountingAuditService();
