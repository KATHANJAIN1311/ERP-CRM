import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { params.push(status); conditions.push(`po.status = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`(po.po_number ILIKE $${params.length} OR po.supplier_name ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM purchase_orders po ${where}`, params);
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT po.*, u.name AS created_by_name FROM purchase_orders po
     LEFT JOIN users u ON po.created_by = u.id
     ${where} ORDER BY po.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT po.*, u.name AS created_by_name FROM purchase_orders po
     LEFT JOIN users u ON po.created_by = u.id WHERE po.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Purchase order not found' });
  const { rows: items } = await pool.query(
    `SELECT poi.*, p.name AS product_name, p.sku FROM purchase_order_items poi
     JOIN products p ON poi.product_id = p.id WHERE poi.po_id=$1`,
    [req.params.id]
  );
  res.json({ ...rows[0], items });
});

export const createPurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { supplier_name, order_date, notes, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const { rows } = await client.query('SELECT id FROM products WHERE id=$1', [item.product_id]);
      if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ message: `Product id ${item.product_id} not found` }); }
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { rows: countRows } = await client.query(`SELECT COUNT(*) FROM purchase_orders WHERE po_number LIKE $1`, [`PO-${date}-%`]);
    const seq = String(Number(countRows[0].count) + 1).padStart(4, '0');
    const poNumber = `PO-${date}-${seq}`;
    const total = items.reduce((sum: number, i: any) => sum + Number(i.qty) * Number(i.unit_price), 0);

    const { rows } = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_name, order_date, notes, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [poNumber, supplier_name, order_date || new Date(), notes || null, total, req.user?.id]
    );
    const po = rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO purchase_order_items (po_id, product_id, qty, unit_price) VALUES ($1,$2,$3,$4)',
        [po.id, item.product_id, item.qty, item.unit_price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(po);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export const receivePurchaseOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "UPDATE purchase_orders SET status='received' WHERE id=$1 AND status='pending' RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Purchase order not found or already processed' }); }

    const { rows: items } = await client.query('SELECT * FROM purchase_order_items WHERE po_id=$1', [req.params.id]);
    for (const item of items) {
      await client.query('UPDATE products SET stock_qty = stock_qty + $1 WHERE id=$2', [item.qty, item.product_id]);
      await client.query(
        `INSERT INTO stock_movements (product_id, qty, movement_type, reason, created_by) VALUES ($1,$2,'IN',$3,$4)`,
        [item.product_id, item.qty, `PO ${rows[0].po_number}`, req.user?.id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Purchase order received and stock updated', po: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
