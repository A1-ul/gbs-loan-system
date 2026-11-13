const ROLE_HIERARCHY = {
  MANAGER: ['MANAGER', 'STAFF', 'COLLECTOR', 'ACCOUNTANT', 'MEMBER', 'GUARANTOR'],
  STAFF: ['STAFF', 'COLLECTOR', 'MEMBER', 'GUARANTOR'],
  COLLECTOR: ['COLLECTOR', 'MEMBER'],
  ACCOUNTANT: ['ACCOUNTANT'],
  MEMBER: ['MEMBER'],
  GUARANTOR: ['GUARANTOR']
};

class RbacService {
  hasPermission(userRole, targetRole) {
    if (!ROLE_HIERARCHY[userRole]) return false;
    return ROLE_HIERARCHY[userRole].includes(targetRole);
  }
}

module.exports = new RbacService();
