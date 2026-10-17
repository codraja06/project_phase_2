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
    message: 'Auth register endpoint is active. Submit an HTTP POST request to create an account.',
  });
});
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/google', authRateLimiter, googleAuth);
router.post('/google/link', authenticate, authRateLimiter, linkGoogle);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
