import { Router } from 'express';
import { body, query } from 'express-validator';
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, addCustomerNote } from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['lead', 'active', 'inactive']).withMessage('Invalid status'),
    query('customer_type').optional().isIn(['retail', 'wholesale', 'distributor']).withMessage('Invalid customer type'),
  ],
  validate, getCustomers
);
router.get('/:id', getCustomer);
router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('mobile').notEmpty().withMessage('Mobile is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required'),
    body('customer_type').optional().isIn(['retail', 'wholesale', 'distributor']).withMessage('Invalid customer type'),
    body('status').optional().isIn(['lead', 'active', 'inactive']).withMessage('Invalid status'),
  ],
  validate, createCustomer
);
router.put('/:id',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required'),
    body('customer_type').optional().isIn(['retail', 'wholesale', 'distributor']).withMessage('Invalid customer type'),
    body('status').optional().isIn(['lead', 'active', 'inactive']).withMessage('Invalid status'),
  ],
  validate, updateCustomer
);
router.delete('/:id', deleteCustomer);
router.post('/:id/notes', [body('note').notEmpty().withMessage('Note cannot be empty')], validate, addCustomerNote);

export default router;
