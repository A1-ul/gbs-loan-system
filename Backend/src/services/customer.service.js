const customerRepository = require('../repositories/customer.repository');

class CustomerService {
  async getUserConsents(userId) {
    return customerRepository.findConsents(userId);
  }

  async updateUserConsent(userId, consentType, granted) {
    return customerRepository.setConsent(userId, consentType, granted);
  }
}

module.exports = new CustomerService();
