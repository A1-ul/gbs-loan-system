const migrationRoutes = require('./routes/migration.routes');
const migrationService = require('./services/migration.service');
const migrationController = require('./controllers/migration.controller');

module.exports = {
  migrationRoutes,
  migrationService,
  migrationController,
};
