import { Router } from 'express';
import { body, query } from 'express-validator';
import { getFollowups, createFollowup, updateFollowupStatus, getTodayFollowups } from '../controllers/crmController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/today', getTodayFollowups);
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'done', 'cancelled']).withMessage('Invalid status'),
    query('type').optional().isIn(['call', 'email', 'meeting', 'whatsapp']).withMessage('Invalid type'),
  ],
  validate, getFollowups
);
router.post('/',
  [
    body('customer_id').isInt({ gt: 0 }).withMessage('Valid customer is required'),
    body('followup_date').isDate().withMessage('Valid follow-up date is required'),
    body('type').optional().isIn(['call', 'email', 'meeting', 'whatsapp']).withMessage('Invalid type'),
  ],
  validate, createFollowup
);
router.patch('/:id/status',
  [
    body('status').isIn(['pending', 'done', 'cancelled']).withMessage('Status must be pending, done, or cancelled'),
  ],
  validate, updateFollowupStatus
);

export default router;
