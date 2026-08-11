import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, customer_type, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR mobile ILIKE $${params.length} OR business_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (customer_type) { params.push(customer_type); conditions.push(`customer_type = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM customers ${where}`, params);
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Customer not found' });
  const { rows: notes } = await pool.query(
    `SELECT n.*, u.name as created_by_name FROM customer_notes n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.customer_id=$1 ORDER BY n.created_at DESC`,
    [req.params.id]
  );
  res.json({ ...rows[0], customer_notes: notes });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, mobile, email, business_name, gstin, customer_type, address, status, followup_date, notes } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO customers (name, mobile, email, business_name, gstin, customer_type, address, status, followup_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, mobile, email || null, business_name || null, gstin || null, customer_type || 'retail', address || null, status || 'lead', followup_date || null, notes || null]
  );
  res.status(201).json(rows[0]);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, mobile, email, business_name, gstin, customer_type, address, status, followup_date, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE customers SET name=$1, mobile=$2, email=$3, business_name=$4, gstin=$5,
     customer_type=$6, address=$7, status=$8, followup_date=$9, notes=$10
     WHERE id=$11 RETURNING *`,
    [name, mobile, email || null, business_name || null, gstin || null, customer_type, address || null, status, followup_date || null, notes || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Customer not found' });
  res.json(rows[0]);
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query('DELETE FROM customers WHERE id=$1 RETURNING id', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Customer not found' });
  res.json({ message: 'Customer deleted' });
});

export const addCustomerNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { note } = req.body;
  const { rows: customer } = await pool.query('SELECT id FROM customers WHERE id=$1', [req.params.id]);
  if (!customer[0]) return res.status(404).json({ message: 'Customer not found' });
  const { rows } = await pool.query(
    `INSERT INTO customer_notes (customer_id, note, created_by) VALUES ($1,$2,$3)
     RETURNING *, (SELECT name FROM users WHERE id=$3) as created_by_name`,
    [req.params.id, note, req.user?.id]
  );
  res.status(201).json(rows[0]);
});
