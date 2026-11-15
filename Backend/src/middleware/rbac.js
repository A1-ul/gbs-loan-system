const { AuthorizationError } = require('../utils/errors');
const { ROLES, ROLE_PERMISSIONS } = require('../constants');

const ROLE_ALIASES = {
  MANAGER: ['OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER'],
  STAFF: ['FIELD_OFFICER', 'STAFF'],
  COLLECTOR: ['COLLECTIONS', 'MOBILE_STAFF', 'COLLECTOR'],
  MEMBER: ['MEMBER_PORTAL', 'MEMBER'],
  GUARANTOR: ['GUARANTOR_PORTAL', 'GUARANTOR'],
  MEMBER_PORTAL: ['MEMBER', 'MEMBER_PORTAL'],
  GUARANTOR_PORTAL: ['GUARANTOR', 'GUARANTOR_PORTAL'],
  MOBILE_STAFF: ['COLLECTOR', 'MOBILE_STAFF'],
  FIELD_OFFICER: ['STAFF', 'FIELD_OFFICER'],
};

function normalizeRole(role) {
  return role ? String(role).toUpperCase().replace(/-/g, '_') : '';
}

function authorize(...allowedRoles) {
  const flattenedRoles = allowedRoles.flat().map(normalizeRole);

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AuthorizationError('Authentication required for RBAC evaluation'));
    }

    const userRole = normalizeRole(req.user.role);

    if (userRole === 'COMPANY_OWNER') {
      return next();
    }

    if (flattenedRoles.includes(userRole)) {
      return next();
    }

    const aliases = ROLE_ALIASES[userRole] || [];
    const hasAliasMatch =
      aliases.some((alias) => flattenedRoles.includes(alias)) ||
      flattenedRoles.some((allowedRole) => (ROLE_ALIASES[allowedRole] || []).includes(userRole));
    if (hasAliasMatch) {
      return next();
    }

    return next(new AuthorizationError(`Role '${req.user.role}' is not authorized to perform this operation.`));
  };
}

function requirePermission(...requiredPermissions) {
  const permsNeeded = requiredPermissions.flat();
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AuthorizationError('Authentication required'));
    }
    const role = normalizeRole(req.user.role);
    if (role === 'COMPANY_OWNER') return next();

    const granted = ROLE_PERMISSIONS?.[role] || [];
    const allowed = permsNeeded.some((p) => granted.includes(p));
    if (!allowed) {
      return next(new AuthorizationError(`Missing required permission: ${permsNeeded.join(', ')}`));
    }
    return next();
  };
}

const companyOwnerOnly = authorize(ROLES.COMPANY_OWNER);
const executiveOnly = authorize(ROLES.COMPANY_OWNER, ROLES.BOARD_EXECUTIVE, ROLES.EXECUTIVE_MANAGEMENT);
const managementAndAbove = authorize(
  ROLES.COMPANY_OWNER, ROLES.BOARD_EXECUTIVE, ROLES.EXECUTIVE_MANAGEMENT,
  ROLES.REGIONAL_MANAGER, ROLES.BRANCH_MANAGER, ROLES.OPERATIONS_MANAGER, ROLES.MANAGER
);
const creditTeam = authorize(
  ROLES.COMPANY_OWNER, ROLES.OPERATIONS_MANAGER, ROLES.MANAGER, ROLES.SENIOR_CREDIT_OFFICER,
  ROLES.LOAN_UNDERWRITER, ROLES.CREDIT_ANALYST, ROLES.LOAN_OFFICER
);
const financeTeam = authorize(
  ROLES.COMPANY_OWNER, ROLES.FINANCE_MANAGER, ROLES.TREASURY, ROLES.ACCOUNTANT
);
const fieldTeam = authorize(
  ROLES.COMPANY_OWNER, ROLES.COLLECTIONS, ROLES.FIELD_OFFICER, ROLES.STAFF, ROLES.MOBILE_STAFF, ROLES.COLLECTOR
);
const securityAndAudit = authorize(
  ROLES.COMPANY_OWNER, ROLES.INTERNAL_AUDIT, ROLES.COMPLIANCE, ROLES.FRAUD_INVESTIGATION,
  ROLES.SECURITY_OPERATIONS, ROLES.RISK_MANAGEMENT, ROLES.LEGAL_DEPARTMENT
);
const memberOnly = authorize(ROLES.MEMBER_PORTAL, ROLES.MEMBER);
const guarantorOnly = authorize(ROLES.GUARANTOR_PORTAL, ROLES.GUARANTOR);

module.exports = {
  authorize,
  requireRole: authorize,
  requirePermission,
  normalizeRole,
  companyOwnerOnly,
  executiveOnly,
  managementAndAbove,
  creditTeam,
  financeTeam,
  fieldTeam,
  securityAndAudit,
  memberOnly,
  guarantorOnly,
  managerOnly: managementAndAbove,
  staffAndAbove: authorize(
    ROLES.COMPANY_OWNER, ROLES.EXECUTIVE_MANAGEMENT, ROLES.REGIONAL_MANAGER,
    ROLES.MANAGER, ROLES.OPERATIONS_MANAGER, ROLES.BRANCH_MANAGER, ROLES.ACCOUNTANT,
    ROLES.FINANCE_MANAGER, ROLES.TREASURY, ROLES.STAFF, ROLES.FIELD_OFFICER,
    ROLES.LOAN_OFFICER, ROLES.SENIOR_CREDIT_OFFICER, ROLES.CREDIT_ANALYST, ROLES.LOAN_UNDERWRITER,
    ROLES.COLLECTIONS, ROLES.MOBILE_STAFF, ROLES.COLLECTOR, ROLES.CUSTOMER_SERVICE, ROLES.RECEPTION,
    ROLES.HUMAN_RESOURCE, ROLES.LEGAL_DEPARTMENT, ROLES.COMPLIANCE, ROLES.INTERNAL_AUDIT,
    ROLES.RISK_MANAGEMENT, ROLES.FRAUD_INVESTIGATION, ROLES.SECURITY_OPERATIONS,
    ROLES.MARKETING, ROLES.INVESTOR, ROLES.BOARD_EXECUTIVE
  ),
  accountantAndAbove: financeTeam,
  collectorOnly: fieldTeam,
};
