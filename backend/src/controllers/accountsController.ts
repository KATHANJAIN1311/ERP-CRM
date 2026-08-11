import { Request, Response } from 'express';
import pool from '../config/db';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getExpenses = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT e.*, u.name as created_by_name FROM expenses e
     LEFT JOIN users u ON u.id = e.created_by
     ORDER BY e.expense_date DESC, e.id DESC`
  );
  res.json({ data: rows });
});

export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category, vendor_name, amount, expense_date, payment_mode, reference_no, notes } = req.body;
  const num = `EXP-${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO expenses (expense_number, category, vendor_name, amount, expense_date, payment_mode, reference_no, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [num, category, vendor_name, amount, expense_date || new Date().toISOString().slice(0, 10), payment_mode || 'cash', reference_no, notes, req.user?.id]
  );
  res.status(201).json(rows[0]);
});

export const getFinancialSummary = asyncHandler(async (_req: Request, res: Response) => {
  const [income, expenses, invoices] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(paid_amount),0) as total_received FROM invoices`),
    pool.query(`SELECT COALESCE(SUM(amount),0) as total_expenses FROM expenses`),
    pool.query(`
      SELECT
        COALESCE(SUM(total_amount),0) as total_invoiced,
        COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status IN ('unpaid','partial')),0) as outstanding,
        COUNT(*) FILTER (WHERE status='unpaid') as unpaid_count,
        COUNT(*) FILTER (WHERE status='partial') as partial_count,
        COUNT(*) FILTER (WHERE status='paid') as paid_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status IN ('unpaid','partial')) as overdue_count
      FROM invoices
    `),
  ]);

  res.json({
    total_received: Number(income.rows[0].total_received),
    total_expenses: Number(expenses.rows[0].total_expenses),
    total_invoiced: Number(invoices.rows[0].total_invoiced),
    outstanding: Number(invoices.rows[0].outstanding),
    unpaid_count: Number(invoices.rows[0].unpaid_count),
    partial_count: Number(invoices.rows[0].partial_count),
    paid_count: Number(invoices.rows[0].paid_count),
    overdue_count: Number(invoices.rows[0].overdue_count),
    net_profit: Number(income.rows[0].total_received) - Number(expenses.rows[0].total_expenses),
  });
});

export const getPaymentRecords = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT pr.*, i.invoice_number, c.name as customer_name, u.name as created_by_name
     FROM payment_records pr
     JOIN invoices i ON i.id = pr.invoice_id
     JOIN customers c ON c.id = i.customer_id
     LEFT JOIN users u ON u.id = pr.created_by
     ORDER BY pr.payment_date DESC, pr.id DESC`
  );
  res.json({ data: rows });
});
