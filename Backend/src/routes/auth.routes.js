const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { authSchemas } = require('../validators');

const router = express.Router();

router.post('/register', authLimiter, validate(authSchemas.register), authController.register);
router.post('/login', authLimiter, validate(authSchemas.login), authController.login);
router.get('/me', authenticate, authController.me);
router.post('/verify-otp', authLimiter, validate(authSchemas.verifyOtp), authController.verifyOtp);
router.post('/resend-otp', authLimiter, validate(authSchemas.resendOtp), authController.resendOtp);
router.post('/refresh-token', validate(authSchemas.refreshToken), authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/enable', authenticate, validate(authSchemas.enable2FA), authController.enable2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);
router.post('/profile-picture', authenticate, authController.updateProfilePicture);

module.exports = router;
