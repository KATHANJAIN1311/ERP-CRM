import { Router } from 'express';
import { body, query } from 'express-validator';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getLowStockProducts, getStockMovements, addStockMovement } from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/low-stock', getLowStockProducts);
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate, getProducts
);
router.get('/:id', getProduct);
router.post('/',
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('selling_price').isNumeric().withMessage('Selling price must be a number'),
    body('purchase_price').isNumeric().withMessage('Purchase price must be a number'),
    body('unit').optional().isIn(['pcs', 'kg', 'ltr', 'box', 'mtr', 'dozen']).withMessage('Invalid unit'),
  ],
  validate, createProduct
);
router.put('/:id',
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('selling_price').isNumeric().withMessage('Selling price must be a number'),
    body('purchase_price').isNumeric().withMessage('Purchase price must be a number'),
  ],
  validate, updateProduct
);
router.delete('/:id', deleteProduct);
router.get('/:id/movements',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate, getStockMovements
);
router.post('/:id/movements',
  [
    body('qty').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
    body('movement_type').isIn(['IN', 'OUT']).withMessage('Movement type must be IN or OUT'),
  ],
  validate, addStockMovement
);

export default router;
