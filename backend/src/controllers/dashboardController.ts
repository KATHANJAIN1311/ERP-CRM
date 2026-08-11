import { Request, Response } from 'express';
import pool from '../config/db';
import { asyncHandler } from '../middleware/errorHandler';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [customers, products, invoices, lowStock, overdue, todayFollowups] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM customers'),
    pool.query('SELECT COUNT(*) FROM products'),
    pool.query(`SELECT
      COUNT(*) FILTER (WHERE status='unpaid') as unpaid,
      COUNT(*) FILTER (WHERE status='partial') as partial,
      COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status IN ('unpaid','partial')), 0) as outstanding
      FROM invoices`),
    pool.query('SELECT COUNT(*) FROM products WHERE stock_qty <= low_stock_alert'),
    pool.query(`SELECT COUNT(*) FROM invoices WHERE due_date < CURRENT_DATE AND status IN ('unpaid','partial')`),
    pool.query(`SELECT COUNT(*) FROM crm_followups WHERE followup_date = CURRENT_DATE AND status='pending'`),
  ]);

  res.json({
    total_customers: Number(customers.rows[0].count),
    total_products: Number(products.rows[0].count),
    unpaid_invoices: Number(invoices.rows[0].unpaid),
    partial_invoices: Number(invoices.rows[0].partial),
    outstanding_amount: Number(invoices.rows[0].outstanding),
    low_stock_count: Number(lowStock.rows[0].count),
    overdue_invoices: Number(overdue.rows[0].count),
    today_followups: Number(todayFollowups.rows[0].count),
  });
});
