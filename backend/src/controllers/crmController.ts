import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getFollowups = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, customer_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { params.push(status); conditions.push(`f.status = $${params.length}`); }
  if (type) { params.push(type); conditions.push(`f.type = $${params.length}`); }
  if (customer_id) { params.push(Number(customer_id)); conditions.push(`f.customer_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`c.name ILIKE $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM crm_followups f JOIN customers c ON f.customer_id = c.id ${where}`, params
  );
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT f.*, c.name AS customer_name, u.name AS assigned_to_name FROM crm_followups f
     JOIN customers c ON f.customer_id = c.id
     LEFT JOIN users u ON f.assigned_to = u.id
     ${where} ORDER BY f.followup_date ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getTodayFollowups = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT f.*, c.name AS customer_name, c.phone FROM crm_followups f
     JOIN customers c ON f.customer_id = c.id
     WHERE f.followup_date = CURRENT_DATE AND f.status = 'pending'
     ORDER BY f.created_at ASC`
  );
  res.json(rows);
});

export const createFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customer_id, assigned_to, followup_date, type, notes } = req.body;

  const { rows: customer } = await pool.query('SELECT id FROM customers WHERE id=$1', [customer_id]);
  if (!customer[0]) return res.status(404).json({ message: 'Customer not found' });

  const { rows } = await pool.query(
    `INSERT INTO crm_followups (customer_id, assigned_to, followup_date, type, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [customer_id, assigned_to || req.user?.id, followup_date, type || 'call', notes || null]
  );
  res.status(201).json(rows[0]);
});

export const updateFollowupStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const { rows } = await pool.query(
    'UPDATE crm_followups SET status=$1, notes=$2 WHERE id=$3 RETURNING *',
    [status, notes || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Follow-up not found' });
  res.json(rows[0]);
});
