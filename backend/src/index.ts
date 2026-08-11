import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import purchaseOrderRoutes from './routes/purchaseOrders';
import challanRoutes from './routes/challans';
import invoiceRoutes from './routes/invoices';
import crmRoutes from './routes/crm';
import { getDashboard } from './controllers/dashboardController';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!origin || !allowed || origin.replace(/\/$/, '') === allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/dashboard', authenticate, getDashboard);

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/crm', crmRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;
