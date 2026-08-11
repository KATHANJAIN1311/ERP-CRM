import { Router } from 'express';
import { body } from 'express-validator';
import { login } from '../controllers/authController';
import { validate } from '../middleware/errorHandler';

const router = Router();

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, login
);

export default router;
