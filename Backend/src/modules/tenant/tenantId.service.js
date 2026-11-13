/**
 * GBS LOAN MANAGEMENT SYSTEM - TENANT ID & CODE GENERATION SERVICE
 * Generates and Validates Canonical Unique Tenant Identifiers
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');

class TenantIdService {
  /**
   * Generate next sequential/unique tenant code (e.g. TNT-101)
   */
  async generateUniqueTenantCode(prefix = 'TNT') {
    const count = await prisma.tenant.count();
    let nextNum = 100 + count + 1;
    let code = `${prefix}-${nextNum}`;

    let exists = await prisma.tenant.findUnique({ where: { code } });
    while (exists) {
      nextNum++;
      code = `${prefix}-${nextNum}`;
      exists = await prisma.tenant.findUnique({ where: { code } });
    }

    return code;
  }

  /**
   * Resolve tenant by ID or unique Code
   */
  async resolveTenantId(idOrCode) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      select: { id: true, code: true, name: true, status: true },
    });
    return tenant ? tenant.id : null;
  }
}

module.exports = new TenantIdService();
