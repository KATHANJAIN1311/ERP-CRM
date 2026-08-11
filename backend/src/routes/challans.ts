import { Router } from 'express';
import { body, query } from 'express-validator';
import { getChallans, getChallan, createChallan, confirmChallan, cancelChallan } from '../controllers/challanController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'confirmed', 'cancelled']).withMessage('Invalid status'),
  ],
  validate, getChallans
);
router.get('/:id', getChallan);
router.post('/',
  [
    body('customer_id').isInt({ gt: 0 }).withMessage('Valid customer is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isInt({ gt: 0 }).withMessage('Valid product is required for each item'),
    body('items.*.qty').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0 for each item'),
    body('status').optional().isIn(['draft', 'confirmed']).withMessage('Status must be draft or confirmed'),
  ],
  validate, createChallan
);
router.patch('/:id/confirm', confirmChallan);
router.patch('/:id/cancel', cancelChallan);

export default router;
