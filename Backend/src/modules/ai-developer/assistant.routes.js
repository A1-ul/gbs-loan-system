const express = require('express');
const assistantController = require('./assistant.controller');
const { authenticateDeveloper } = require('../../middleware/developerAuth');

const router = express.Router();

// Strictly Developer Landlord exclusive
router.use(authenticateDeveloper);

router.post('/analyze-crash', assistantController.analyzeCrash);
router.get('/check-structure', assistantController.checkStructure);
router.get('/architecture-report', assistantController.getArchitectureReport);

module.exports = router;
