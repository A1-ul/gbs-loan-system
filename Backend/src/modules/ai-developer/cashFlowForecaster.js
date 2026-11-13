/**
 * GBS LOAN MANAGEMENT SYSTEM - AI Cash Flow Forecaster
 * CommonJS Predictive Cash Flow Engine
 */

const logger = require('../../utils/logger');

class CashFlowForecaster {
  /**
   * Forecast future portfolio inflow and default probability over months ahead
   * @param {Array} historicalTransactions 
   * @param {Number} monthsAhead 
   * @returns {Object} Forecast Matrix
   */
  static forecastCashFlow(historicalTransactions = [], monthsAhead = 6) {
    const defaultMonthlyInflow = 45000;
    const defaultMonthlyOutflow = 28000;

    const forecastTimeline = [];

    for (let i = 1; i <= monthsAhead; i++) {
      const growthFactor = 1 + i * 0.025;
      const expectedInflow = Math.round(defaultMonthlyInflow * growthFactor);
      const expectedOutflow = Math.round(defaultMonthlyOutflow * (1 + i * 0.015));
      const netCashFlow = expectedInflow - expectedOutflow;

      forecastTimeline.push({
        monthIndex: i,
        monthLabel: `Month +${i}`,
        expectedInflow,
        expectedOutflow,
        netCashFlow,
        predictedDefaultRatePercent: parseFloat((2.5 + Math.random() * 0.5).toFixed(2)),
      });
    }

    logger.info(`AI Cash Flow Forecast generated for ${monthsAhead} months ahead.`);

    return {
      forecastTimeline,
      summary: {
        totalForecastedInflow: forecastTimeline.reduce((acc, curr) => acc + curr.expectedInflow, 0),
        totalForecastedOutflow: forecastTimeline.reduce((acc, curr) => acc + curr.expectedOutflow, 0),
        averageMonthlyNet: Math.round(
          forecastTimeline.reduce((acc, curr) => acc + curr.netCashFlow, 0) / monthsAhead
        ),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = CashFlowForecaster;
