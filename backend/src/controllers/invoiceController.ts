import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { status, customer_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }
  if (customer_id) { params.push(Number(customer_id)); conditions.push(`i.customer_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`(i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM invoices i JOIN customers c ON i.customer_id = c.id ${where}`, params
  );
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT i.*, c.name AS customer_name FROM invoices i
     JOIN customers c ON i.customer_id = c.id
     ${where} ORDER BY i.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT i.*, c.name AS customer_name, c.phone, c.mobile, c.email AS customer_email,
     c.gstin, c.address, u.name AS created_by_name
     FROM invoices i
     JOIN customers c ON i.customer_id = c.id
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Invoice not found' });

  let items: any[] = [];
  if (rows[0].challan_id) {
    const { rows: challanItems } = await pool.query(
      'SELECT * FROM challan_items WHERE challan_id=$1',
      [rows[0].challan_id]
    );
    items = challanItems;
  }

  res.json({ ...rows[0], items });
});

export const createInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customer_id, challan_id, invoice_date, due_date, subtotal, tax_percent = 18, notes } = req.body;

  const { rows: customer } = await pool.query('SELECT id FROM customers WHERE id=$1', [customer_id]);
  if (!customer[0]) return res.status(404).json({ message: 'Customer not found' });

  if (challan_id) {
    const { rows: challan } = await pool.query('SELECT id, status FROM challans WHERE id=$1', [challan_id]);
    if (!challan[0]) return res.status(404).json({ message: 'Challan not found' });
    if (challan[0].status === 'cancelled') return res.status(400).json({ message: 'Cannot invoice a cancelled challan' });
  }

  const taxAmount = (Number(subtotal) * Number(tax_percent)) / 100;
  const totalAmount = Number(subtotal) + taxAmount;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`, [`INV-${date}-%`]);
  const seq = String(Number(countRows[0].count) + 1).padStart(4, '0');
  const invoiceNumber = `INV-${date}-${seq}`;

  const { rows } = await pool.query(
    `INSERT INTO invoices (invoice_number, customer_id, challan_id, invoice_date, due_date,
     subtotal, tax_percent, tax_amount, total_amount, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [invoiceNumber, customer_id, challan_id || null, invoice_date, due_date || null,
     subtotal, tax_percent, taxAmount, totalAmount, notes || null, req.user?.id]
  );

  res.status(201).json(rows[0]);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  if (Number(amount) <= 0) return res.status(400).json({ message: 'Payment amount must be greater than 0' });

  const { rows: inv } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!inv[0]) return res.status(404).json({ message: 'Invoice not found' });
  if (inv[0].status === 'paid') return res.status(400).json({ message: 'Invoice is already fully paid' });
  if (inv[0].status === 'cancelled') return res.status(400).json({ message: 'Cannot record payment on a cancelled invoice' });

  const newPaid = Number(inv[0].paid_amount) + Number(amount);
  if (newPaid > Number(inv[0].total_amount)) return res.status(400).json({ message: `Payment exceeds outstanding amount. Max: ${Number(inv[0].total_amount) - Number(inv[0].paid_amount)}` });

  const status = newPaid >= Number(inv[0].total_amount) ? 'paid' : 'partial';
  const { rows } = await pool.query(
    'UPDATE invoices SET paid_amount=$1, status=$2 WHERE id=$3 RETURNING *',
    [newPaid, status, req.params.id]
  );
  res.json(rows[0]);
});

export const getOverdueInvoices = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT i.*, c.name AS customer_name FROM invoices i
     JOIN customers c ON i.customer_id = c.id
     WHERE i.due_date < CURRENT_DATE AND i.status IN ('unpaid','partial')
     ORDER BY i.due_date ASC`
  );
  res.json(rows);
});
