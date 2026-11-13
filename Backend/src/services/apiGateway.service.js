/**
 * GBS Enterprise API Gateway Service
 * 
 * Provides centralized routing metadata, service registry, request metrics tracking,
 * and gateway security health statistics.
 */

class ApiGatewayService {
  constructor() {
    this.startTime = Date.now();
    this.routeCatalog = [
      { prefix: '/api/v1/auth', service: 'Authentication & Session Service', status: 'ONLINE', rateLimitTier: 'AUTH_STRICT' },
      { prefix: '/api/v1/members', service: 'Member & Customer Management', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/guarantors', service: 'Guarantor & Collateral Service', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/loans', service: 'Loan Origination, Workflow & Repayment', status: 'ONLINE', rateLimitTier: 'TRANSACTION_STRICT' },
      { prefix: '/api/v1/payments', service: 'Fintech, MoMo & Cash Repayment Engine', status: 'ONLINE', rateLimitTier: 'TRANSACTION_STRICT' },
      { prefix: '/api/v1/staff', service: 'Staff & Role Management', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/collectors', service: 'Field Collector Logistics & Operations', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/gps', service: 'Live Geofencing & GPS Telemetry', status: 'ONLINE', rateLimitTier: 'HIGH_FREQUENCY' },
      { prefix: '/api/v1/notifications', service: 'Enterprise Multi-Channel Notifications (SMS, Email, Push)', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/salaries', service: 'HR & Employee Compensation Engine', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/reports', service: 'Financial & Regulatory Reporting Analytics', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/system', service: 'System Health, Telemetry & Auto-Recovery', status: 'ONLINE', rateLimitTier: 'SENSITIVE_OP' },
      { prefix: '/api/v1/audit-logs', service: 'Enterprise Audit Trail & Mutation Tracker', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/voice-auth', service: 'Voice Identity Biometric Verification Engine', status: 'ONLINE', rateLimitTier: 'AUTH_STRICT' },
      { prefix: '/api/v1/hr/salary-grouping', service: 'Hierarchy & Band Compensation Service', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/developer', service: 'Hidden Developer Control Platform & Remote Lock', status: 'ONLINE', rateLimitTier: 'SENSITIVE_OP' },
      { prefix: '/api/v1/ai-developer', service: 'AI Diagnostic & Code Architecture Assistant', status: 'ONLINE', rateLimitTier: 'GLOBAL' },
      { prefix: '/api/v1/migration', service: 'Database Schema & Data Migration Pipeline', status: 'ONLINE', rateLimitTier: 'SENSITIVE_OP' },
    ];
  }

  /**
   * Route inspection & correlation metadata
   */
  routeRequest(req) {
    const matched = this.routeCatalog.find(r => req.originalUrl?.startsWith(r.prefix));
    return {
      requestId: req.id || req.headers['x-request-id'] || `REQ-${Date.now()}`,
      path: req.originalUrl,
      matchedService: matched ? matched.service : 'General API Gateway',
      rateLimitPolicy: matched ? matched.rateLimitTier : 'GLOBAL',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieve Gateway Service Registry & Health Status
   */
  getGatewayStatus() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      gatewayVersion: '2.0.0-enterprise',
      status: 'HEALTHY',
      uptimeSeconds,
      registeredServicesCount: this.routeCatalog.length,
      securityPolicies: {
        helmetProtected: true,
        corsEnforced: true,
        inputSanitization: 'ACTIVE',
        prototypePollutionDefense: 'ACTIVE',
        rateLimitingTiers: ['GLOBAL', 'AUTH_STRICT', 'TRANSACTION_STRICT', 'SENSITIVE_OP'],
      },
      services: this.routeCatalog,
    };
  }
}

module.exports = new ApiGatewayService();
