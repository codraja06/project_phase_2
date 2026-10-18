import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  linkGoogle,
  logout,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { signupRequestLimiter, signupVerifyLimiter } from '../middleware/rateLimiter';
import { requestSignupOtp, resendSignupOtp, verifySignupOtp, completeSignup } from '../controllers/signupController';
import { saveNotificationPreferences } from '../controllers/notificationPreferencesController';

const router = Router();

router.get('/login', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Auth login endpoint is active. Submit an HTTP POST request with email and password to log in.',
  });
});
router.get('/register', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Start with POST /api/auth/signup/request-otp. Registration requires a verified challenge.',
  });
});
router.post('/register', authRateLimiter, register);
router.post('/signup/request-otp', signupRequestLimiter, requestSignupOtp);
router.post('/signup/resend-otp', signupRequestLimiter, resendSignupOtp);
router.post('/signup/verify-otp', signupVerifyLimiter, verifySignupOtp);
router.post('/signup/complete', signupVerifyLimiter, completeSignup);
router.put('/notification-preferences', authenticate, saveNotificationPreferences);
router.post('/login', authRateLimiter, login);
router.post('/google', authRateLimiter, googleAuth);
router.post('/google/link', authenticate, authRateLimiter, linkGoogle);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
