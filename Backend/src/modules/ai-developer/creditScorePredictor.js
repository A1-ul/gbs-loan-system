/**
 * GBS LOAN MANAGEMENT SYSTEM - AI Credit Scoring Predictor
 * CommonJS Machine Learning Predictor Engine
 */

const logger = require('../../utils/logger');

class CreditScorePredictor {
  /**
   * Calculate borrower credit score based on historical repayment, income, debt ratio & biometric trust factor
   * @param {Object} applicantData 
   * @returns {Object} Credit Assessment Result
   */
  static predictScore(applicantData) {
    const {
      monthlyIncome = 0,
      existingDebt = 0,
      pastRepaymentRatio = 1.0, // 0.0 - 1.0
      guarantorTrustScore = 80,
      employmentStatus = 'EMPLOYED',
    } = applicantData;

    let baseScore = 600;

    // Debt-to-income weighting
    const dti = monthlyIncome > 0 ? existingDebt / monthlyIncome : 1.0;
    if (dti < 0.3) baseScore += 100;
    else if (dti < 0.5) baseScore += 50;
    else baseScore -= 80;

    // Past Repayment Weighting
    baseScore += Math.round(pastRepaymentRatio * 150);

    // Employment Status Weighting
    if (employmentStatus === 'PERMANENT_EMPLOYED') baseScore += 50;
    else if (employmentStatus === 'SELF_EMPLOYED') baseScore += 25;

    // Guarantor factor
    baseScore += Math.round((guarantorTrustScore / 100) * 50);

    // Clamp score between 300 and 850
    const finalScore = Math.min(850, Math.max(300, baseScore));

    let riskLevel = 'LOW';
    let maxRecommendedLoan = monthlyIncome * 4;

    if (finalScore < 550) {
      riskLevel = 'HIGH';
      maxRecommendedLoan = monthlyIncome * 1;
    } else if (finalScore < 700) {
      riskLevel = 'MEDIUM';
      maxRecommendedLoan = monthlyIncome * 2.5;
    }

    logger.info(`AI Credit Score evaluated: ${finalScore} Risk: ${riskLevel}`);

    return {
      creditScore: finalScore,
      riskLevel,
      maxRecommendedLoan: Math.round(maxRecommendedLoan),
      dtiRatio: parseFloat(dti.toFixed(2)),
      evaluatedAt: new Date().toISOString(),
    };
  }
}

module.exports = CreditScorePredictor;
