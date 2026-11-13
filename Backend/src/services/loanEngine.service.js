/**
 * Loan Engine - Automated interest & penalty calculations
 * Blueprint: Loan Engine module
 */

const config = require('../config');

function calculateLoan({ principal, interestRate, termMonths, penaltyRate }) {
  const rate = interestRate ?? config.loan.defaultInterestRate;
  const totalInterest = principal * (rate / 100) * (termMonths / 12);
  const totalAmount = principal + totalInterest;
  const monthlyPayment = totalAmount / termMonths;

  return {
    principal,
    interestRate: rate,
    termMonths,
    totalInterest: round(totalInterest),
    totalAmount: round(totalAmount),
    monthlyPayment: round(monthlyPayment),
    penaltyRate: penaltyRate ?? config.loan.defaultPenaltyRate,
  };
}

function generateRepaymentSchedule(loan) {
  const calc = calculateLoan({
    principal: Number(loan.principalAmount),
    interestRate: Number(loan.interestRate),
    termMonths: loan.termMonths,
  });

  const schedule = [];
  const principalPerMonth = Number(loan.principalAmount) / loan.termMonths;
  const interestPerMonth = calc.totalInterest / loan.termMonths;
  const startDate = loan.disbursedAt ? new Date(loan.disbursedAt) : new Date();

  for (let i = 1; i <= loan.termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue: round(principalPerMonth),
      interestDue: round(interestPerMonth),
      totalDue: round(principalPerMonth + interestPerMonth),
    });
  }

  return schedule;
}

function calculatePenalty(outstandingAmount, daysOverdue, penaltyRate) {
  const rate = penaltyRate ?? config.loan.defaultPenaltyRate;
  const dailyRate = rate / 100 / 30;
  return round(outstandingAmount * dailyRate * daysOverdue);
}

function calculateOutstanding(loan, payments) {
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return round(Number(loan.totalAmount) - totalPaid);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  calculateLoan,
  generateRepaymentSchedule,
  calculatePenalty,
  calculateOutstanding,
};
