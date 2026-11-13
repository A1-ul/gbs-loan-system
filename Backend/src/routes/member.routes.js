const express = require('express');
const memberController = require('../controllers/member.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, managerOnly } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { memberSchemas } = require('../validators');

const router = express.Router();

router.post('/', authenticate, validate(memberSchemas.create), memberController.create);
router.get('/', authenticate, memberController.getAll);
router.get('/stats', authenticate, staffAndAbove, memberController.getStats);
router.get('/me', authenticate, memberController.getMyProfile);
router.get('/:id', authenticate, memberController.getById);
router.put('/:id', authenticate, validate(memberSchemas.update), memberController.update);
router.post('/:id/verify-ghana-card', authenticate, staffAndAbove, memberController.verifyGhanaCard);
router.post('/:id/profile-picture', authenticate, upload.single('picture'), memberController.uploadProfilePicture);

// Deletion Approval Lifecycle
router.post('/:id/request-deletion', authenticate, staffAndAbove, memberController.requestDeletion);
router.post('/:id/approve-deletion', authenticate, managerOnly, memberController.approveDeletion);
router.post('/:id/reject-deletion', authenticate, managerOnly, memberController.rejectDeletion);

module.exports = router;
