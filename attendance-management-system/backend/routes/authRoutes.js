const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/firebase-login', authController.firebaseLogin);
router.post('/register', authController.register);
router.get('/me', authenticate, authController.me);

module.exports = router;
