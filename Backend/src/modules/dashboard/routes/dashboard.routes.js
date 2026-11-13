const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateJwt } = require('../../../middleware/auth');

const router = express.Router();

router.use(authenticateJwt);

router.get('/', dashboardController.getDashboard);

module.exports = router;
