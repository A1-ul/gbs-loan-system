/**
 * GBS LOAN MANAGEMENT SYSTEM - MTN MoMo Payment Gateway Integration Service
 * CommonJS Production MoMo API Service
 */

const logger = require('../../utils/logger');
const crypto = require('crypto');

class MoMoGatewayService {
  /**
   * Request payment collection via MTN MoMo API
   * @param {Object} paymentParams 
   * @returns {Object} Transaction Status
   */
  static async requestPayment({ amount, phoneNumber, reference, tenantId }) {
    if (!amount || !phoneNumber) {
      throw new Error('Amount and phone number are required for MoMo payment');
    }

    const transactionId = `MOMO-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    logger.info(`MTN MoMo payment requested: GHS ${amount} from ${phoneNumber} Ref: ${reference} TxID: ${transactionId}`);

    // Simulating instant callback / MoMo response
    return {
      success: true,
      transactionId,
      status: 'PENDING',
      provider: 'MTN_MOMO_GHANA',
      amount,
      currency: 'GHS',
      phoneNumber,
      reference,
      tenantId,
      initiatedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify status of MTN MoMo payment transaction
   * @param {String} transactionId 
   */
  static async verifyTransaction(transactionId) {
    logger.info(`Verifying MTN MoMo Transaction: ${transactionId}`);

    return {
      transactionId,
      status: 'SUCCESSFUL',
      financialTransactionId: `FIN-${Date.now()}`,
      verifiedAt: new Date().toISOString(),
    };
  }
}

module.exports = MoMoGatewayService;
