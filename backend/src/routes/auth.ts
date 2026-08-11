import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/authController';
import { validate } from '../middleware/errorHandler';

const router = Router();

router.post('/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'sales', 'warehouse', 'accounts']).withMessage('Invalid role'),
  ],
  validate, register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, login
);

export default router;
