import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation.middleware';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  verifyEmailSchema 
} from '../schemas/auth.schema';

const router = Router();

// POST: /api/auth/register
router.post('/register', validate({ body: registerSchema }), AuthController.register);

// POST: /api/auth/login
router.post('/login', validate({ body: loginSchema }), AuthController.login);

// POST: /api/auth/verify-email
router.post('/verify-email', validate({ body: verifyEmailSchema }), AuthController.verifyEmail);

// POST: /api/auth/refresh
router.post('/refresh', AuthController.refresh);

// POST: /api/auth/forgot-password
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), AuthController.forgotPassword);

// POST: /api/auth/reset-password
router.post('/reset-password', validate({ body: resetPasswordSchema }), AuthController.resetPassword);

// GET: /api/auth/me (Protected)
router.get('/me', authenticateJWT, AuthController.me);

export default router;
