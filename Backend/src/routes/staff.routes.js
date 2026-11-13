const express = require('express');
const staffController = require('../controllers/staff.controller');
const { authenticate } = require('../middleware/auth');
const { managerOnly, staffAndAbove, authorize } = require('../middleware/rbac');

const router = express.Router();

const staffManagers = authorize(
  'SUPER_ADMIN', 'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'HUMAN_RESOURCE'
);

// Staff Attendance Clock In / Clock Out (available to all authenticated staff roles)
router.get('/attendance/my-status', authenticate, staffAndAbove, staffController.myAttendance);
router.post('/attendance/clock-in', authenticate, staffAndAbove, staffController.clockIn);
router.post('/attendance/clock-out', authenticate, staffAndAbove, staffController.clockOut);
router.get('/attendance', authenticate, staffAndAbove, staffController.getAttendanceLogs);

// Staff Creation & Company Owner Approval Queue
router.get('/pending-approvals', authenticate, staffManagers, staffController.getPendingApprovals);
router.post('/provision', authenticate, staffManagers, staffController.registerStaff);
router.post('/:id/approve', authenticate, managerOnly, staffController.approveStaff);

router.get('/', authenticate, staffAndAbove, staffController.getAll);
router.get('/:id', authenticate, staffController.getById);
router.post('/', authenticate, staffManagers, staffController.create);
router.put('/:id', authenticate, staffManagers, staffController.update);
router.delete('/:id', authenticate, managerOnly, staffController.deactivate);

module.exports = router;
