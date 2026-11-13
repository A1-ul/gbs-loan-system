/**
 * Loan Engine - Integer-pesewa precision interest, schedule & penalty calculations
 * Blueprint: Loan Engine module
 */

const config = require('../config');

const toCents = (val) => Math.round(Number(val || 0) * 100);
const fromCents = (cents) => Math.round(Number(cents || 0)) / 100;

function calculateLoan({ principal, interestRate, termMonths, penaltyRate }) {
  const rate = Number(interestRate ?? config.loan.defaultInterestRate);
  const months = Math.max(1, parseInt(termMonths || 1, 10));
  const principalCents = toCents(principal);
  const totalInterestCents = Math.round(principalCents * (rate / 100) * (months / 12));
  const totalAmountCents = principalCents + totalInterestCents;
  const monthlyPaymentCents = Math.round(totalAmountCents / months);

  return {
    principal: fromCents(principalCents),
    interestRate: rate,
    termMonths: months,
    totalInterest: fromCents(totalInterestCents),
    totalAmount: fromCents(totalAmountCents),
    monthlyPayment: fromCents(monthlyPaymentCents),
    penaltyRate: Number(penaltyRate ?? config.loan.defaultPenaltyRate),
  };
}

function generateRepaymentSchedule(loan) {
  const months = Math.max(1, parseInt(loan.termMonths || 1, 10));
  const principalCents = toCents(loan.principalAmount);
  const calc = calculateLoan({
    principal: fromCents(principalCents),
    interestRate: Number(loan.interestRate),
    termMonths: months,
  });

  const totalInterestCents = toCents(calc.totalInterest);
  const basePrincipalPerMonth = Math.floor(principalCents / months);
  const baseInterestPerMonth = Math.floor(totalInterestCents / months);
  const principalRemainder = principalCents - basePrincipalPerMonth * months;
  const interestRemainder = totalInterestCents - baseInterestPerMonth * months;

  const schedule = [];
  const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date();

  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = i === months;
    const pCents = basePrincipalPerMonth + (isLast ? principalRemainder : 0);
    const iCents = baseInterestPerMonth + (isLast ? interestRemainder : 0);

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue: fromCents(pCents),
      interestDue: fromCents(iCents),
      totalDue: fromCents(pCents + iCents),
    });
  }

  return schedule;
}

function calculatePenalty(outstandingAmount, daysOverdue, penaltyRate) {
  const rate = Number(penaltyRate ?? config.loan.defaultPenaltyRate);
  const outstandingCents = toCents(outstandingAmount);
  const dailyRate = rate / 100 / 30;
  return fromCents(Math.round(outstandingCents * dailyRate * Math.max(0, Number(daysOverdue || 0))));
}

function calculateOutstanding(loan, payments) {
  const totalPaidCents = (payments || []).reduce((sum, p) => sum + toCents(p.amount), 0);
  const totalAmountCents = toCents(loan.totalAmount);
  return fromCents(Math.max(0, totalAmountCents - totalPaidCents));
}

function round(value) {
  return fromCents(toCents(value));
}

module.exports = {
  toCents,
  fromCents,
  round,
  calculateLoan,
  generateRepaymentSchedule,
  calculatePenalty,
  calculateOutstanding,
};
