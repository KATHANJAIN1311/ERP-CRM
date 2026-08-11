import { Router } from 'express';
import { getExpenses, createExpense, getFinancialSummary, getPaymentRecords } from '../controllers/accountsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('admin', 'accounts'));

router.get('/summary', getFinancialSummary);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.get('/payments', getPaymentRecords);

export default router;
