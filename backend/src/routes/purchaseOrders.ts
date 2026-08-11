import { Router } from 'express';
import { body, query } from 'express-validator';
import { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, receivePurchaseOrder } from '../controllers/purchaseOrderController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'received', 'cancelled']).withMessage('Invalid status'),
  ],
  validate, getPurchaseOrders
);
router.get('/:id', getPurchaseOrder);
router.post('/',
  [
    body('supplier_name').notEmpty().withMessage('Supplier name is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product_id').isInt({ gt: 0 }).withMessage('Valid product is required for each item'),
    body('items.*.qty').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0 for each item'),
    body('items.*.unit_price').isFloat({ gt: 0 }).withMessage('Unit price must be greater than 0 for each item'),
  ],
  validate, createPurchaseOrder
);
router.patch('/:id/receive', authorize('admin', 'warehouse'), receivePurchaseOrder);

export default router;
