import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
  }
  if (category) { params.push(category); conditions.push(`category = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM products ${where}`, params);
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT * FROM products ${where} ORDER BY name LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
  res.json(rows[0]);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, category, unit, purchase_price, selling_price, stock_qty, low_stock_alert, location } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, sku, category, unit, purchase_price, selling_price, stock_qty, low_stock_alert, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [name, sku, category || null, unit || 'pcs', purchase_price, selling_price, stock_qty || 0, low_stock_alert || 10, location || null]
  );
  res.status(201).json(rows[0]);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, category, unit, purchase_price, selling_price, stock_qty, low_stock_alert, location } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET name=$1, sku=$2, category=$3, unit=$4, purchase_price=$5,
     selling_price=$6, stock_qty=$7, low_stock_alert=$8, location=$9 WHERE id=$10 RETURNING *`,
    [name, sku, category || null, unit, purchase_price, selling_price, stock_qty, low_stock_alert, location || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
  res.json(rows[0]);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

export const getLowStockProducts = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE stock_qty <= low_stock_alert ORDER BY stock_qty ASC'
  );
  res.json(rows);
});

export const getStockMovements = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*) FROM stock_movements WHERE product_id=$1', [req.params.id]
  );
  const total = Number(countRows[0].count);

  const { rows } = await pool.query(
    `SELECT sm.*, p.name AS product_name, p.sku, u.name AS created_by_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE sm.product_id = $1
     ORDER BY sm.created_at DESC LIMIT $2 OFFSET $3`,
    [req.params.id, Number(limit), offset]
  );
  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const addStockMovement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { qty, movement_type, reason } = req.body;
  const productId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const delta = movement_type === 'IN' ? qty : -qty;
    const { rows: updated } = await client.query(
      'UPDATE products SET stock_qty = stock_qty + $1 WHERE id = $2 RETURNING stock_qty',
      [delta, productId]
    );
    if (!updated[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Product not found' }); }
    if (Number(updated[0].stock_qty) < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient stock for OUT movement' });
    }
    const { rows } = await client.query(
      `INSERT INTO stock_movements (product_id, qty, movement_type, reason, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [productId, qty, movement_type, reason || null, req.user?.id || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ movement: rows[0], new_stock: updated[0].stock_qty });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
