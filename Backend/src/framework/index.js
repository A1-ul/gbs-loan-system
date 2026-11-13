/**
 * GBS Enterprise Framework (Build Once)
 * Official Reusable Foundation Shared Across All GBS Enterprise Systems
 * 
 * 13 Pillars:
 * 1. Enterprise Architecture
 * 2. Security
 * 3. Authentication
 * 4. RBAC
 * 5. Notifications
 * 6. Audit
 * 7. Monitoring
 * 8. DevOps
 * 9. API Gateway
 * 10. AI
 * 11. Shared Services
 * 12. Developer Platform
 * 13. Coding Standards
 */

const architecture = require('./architecture');
const security = require('./security');
const authentication = require('./authentication');
const rbac = require('./rbac');
const notifications = require('./notifications');
const audit = require('./audit');
const monitoring = require('./monitoring');
const devops = require('./devops');
const gateway = require('./gateway');
const ai = require('./ai');
const shared = require('./shared');
const developer = require('./developer');
const standards = require('./standards');
const moduleLoader = require('./moduleLoader');

module.exports = {
  name: 'GBS Enterprise Framework',
  version: '2.0.0',
  pillars: [
    'Enterprise Architecture',
    'Security',
    'Authentication',
    'RBAC',
    'Notifications',
    'Audit',
    'Monitoring',
    'DevOps',
    'API Gateway',
    'AI',
    'Shared Services',
    'Developer Platform',
    'Coding Standards',
  ],
  architecture,
  security,
  authentication,
  rbac,
  notifications,
  audit,
  monitoring,
  devops,
  gateway,
  ai,
  shared,
  developer,
  standards,
  moduleLoader,
};
