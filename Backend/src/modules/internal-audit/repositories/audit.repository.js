const { prisma } = require('../../../config/database');

class AuditRepository {
  async findMany(where = {}) {
    return [];
  }

  async findById(id) {
    return null;
  }

  async create(data) {
    return { id: 'generated-id', ...data };
  }

  async update(id, data) {
    return { id, ...data };
  }

  async delete(id) {
    return { id };
  }
}

module.exports = new AuditRepository();
