import { Router } from 'express';
import { body, query } from 'express-validator';
import { getInvoices, getInvoice, createInvoice, recordPayment, getOverdueInvoices } from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/overdue', getOverdueInvoices);
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['unpaid', 'partial', 'paid', 'cancelled']).withMessage('Invalid status'),
  ],
  validate, getInvoices
);
router.get('/:id', getInvoice);
router.post('/',
  [
    body('customer_id').isInt({ gt: 0 }).withMessage('Valid customer is required'),
    body('subtotal').isFloat({ gt: 0 }).withMessage('Subtotal must be greater than 0'),
    body('tax_percent').isFloat({ min: 0, max: 100 }).withMessage('Tax percent must be between 0 and 100'),
    body('invoice_date').isDate().withMessage('Valid invoice date is required'),
    body('due_date').optional({ checkFalsy: true }).isDate().withMessage('Valid due date required'),
  ],
  validate, createInvoice
);
router.patch('/:id/payment',
  [body('amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than 0')],
  validate, recordPayment
);

export default router;
