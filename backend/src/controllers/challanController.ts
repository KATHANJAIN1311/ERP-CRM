import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const getChallans = asyncHandler(async (req: Request, res: Response) => {
  const { status, customer_id, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { params.push(status); conditions.push(`c.status = $${params.length}`); }
  if (customer_id) { params.push(Number(customer_id)); conditions.push(`c.customer_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); conditions.push(`(c.challan_number ILIKE $${params.length} OR cu.name ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM challans c JOIN customers cu ON c.customer_id = cu.id ${where}`, params
  );
  const total = Number(countRows[0].count);

  params.push(Number(limit), offset);
  const { rows } = await pool.query(
    `SELECT c.*, cu.name AS customer_name FROM challans c
     JOIN customers cu ON c.customer_id = cu.id
     ${where} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT c.*, cu.name AS customer_name, cu.phone, cu.address, u.name AS created_by_name
     FROM challans c
     JOIN customers cu ON c.customer_id = cu.id
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Challan not found' });
  const { rows: items } = await pool.query('SELECT * FROM challan_items WHERE challan_id=$1', [req.params.id]);
  res.json({ ...rows[0], items });
});

const genChallanNumber = async (client: any): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await client.query(`SELECT COUNT(*) FROM challans WHERE challan_number LIKE $1`, [`CH-${date}-%`]);
  const seq = String(Number(rows[0].count) + 1).padStart(4, '0');
  return `CH-${date}-${seq}`;
};

export const createChallan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customer_id, challan_date, notes, items, status = 'draft' } = req.body;
  if (!['draft', 'confirmed'].includes(status))
    return res.status(400).json({ message: 'Status must be draft or confirmed' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const enriched: any[] = [];
    for (const item of items) {
      const { rows } = await client.query(
        'SELECT id, name, sku, unit, selling_price, stock_qty FROM products WHERE id=$1',
        [item.product_id]
      );
      if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ message: `Product id ${item.product_id} not found` }); }
      enriched.push({ ...item, product: rows[0] });
    }

    if (status === 'confirmed') {
      const qtyMap: Record<number, number> = {};
      for (const e of enriched) qtyMap[e.product.id] = (qtyMap[e.product.id] || 0) + Number(e.qty);
      for (const e of enriched) {
        const needed = qtyMap[e.product.id];
        if (e.product.stock_qty < needed) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Insufficient stock for "${e.product.name}". Available: ${e.product.stock_qty}, Required: ${needed}` });
        }
      }
    }

    const challanNumber = await genChallanNumber(client);
    const totalQty = enriched.reduce((s, e) => s + Number(e.qty), 0);
    const totalAmount = enriched.reduce((s, e) => s + Number(e.qty) * Number(e.unit_price || e.product.selling_price), 0);

    const { rows } = await client.query(
      `INSERT INTO challans (challan_number, customer_id, challan_date, status, total_qty, total_amount, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [challanNumber, customer_id, challan_date || new Date(), status, totalQty, totalAmount, notes || null, req.user?.id]
    );
    const challan = rows[0];

    for (const e of enriched) {
      const price = Number(e.unit_price || e.product.selling_price);
      await client.query(
        `INSERT INTO challan_items (challan_id, product_id, product_name, product_sku, product_unit, qty, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [challan.id, e.product.id, e.product.name, e.product.sku, e.product.unit, e.qty, price]
      );
    }

    if (status === 'confirmed') {
      const deducted = new Set<number>();
      for (const e of enriched) {
        if (!deducted.has(e.product.id)) {
          const totalQtyForProduct = enriched.filter((x) => x.product.id === e.product.id).reduce((s, x) => s + Number(x.qty), 0);
          await client.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id=$2', [totalQtyForProduct, e.product.id]);
          await client.query(
            `INSERT INTO stock_movements (product_id, qty, movement_type, reason, created_by) VALUES ($1,$2,'OUT',$3,$4)`,
            [e.product.id, totalQtyForProduct, `Challan ${challanNumber}`, req.user?.id]
          );
          deducted.add(e.product.id);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(challan);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export const confirmChallan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM challans WHERE id=$1', [req.params.id]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Challan not found' }); }
    if (rows[0].status !== 'draft') { await client.query('ROLLBACK'); return res.status(400).json({ message: `Cannot confirm a challan with status: ${rows[0].status}` }); }

    const { rows: items } = await client.query('SELECT * FROM challan_items WHERE challan_id=$1', [req.params.id]);
    const qtyMap: Record<number, number> = {};
    for (const item of items) qtyMap[item.product_id] = (qtyMap[item.product_id] || 0) + Number(item.qty);

    for (const [productId, qty] of Object.entries(qtyMap)) {
      const { rows: p } = await client.query('SELECT name, stock_qty FROM products WHERE id=$1', [productId]);
      if (!p[0] || p[0].stock_qty < qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Insufficient stock for "${p[0]?.name}". Available: ${p[0]?.stock_qty}, Required: ${qty}` });
      }
    }

    for (const [productId, qty] of Object.entries(qtyMap)) {
      await client.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id=$2', [qty, productId]);
      await client.query(
        `INSERT INTO stock_movements (product_id, qty, movement_type, reason, created_by) VALUES ($1,$2,'OUT',$3,$4)`,
        [productId, qty, `Challan ${rows[0].challan_number}`, req.user?.id]
      );
    }

    const { rows: updated } = await client.query("UPDATE challans SET status='confirmed' WHERE id=$1 RETURNING *", [req.params.id]);
    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export const cancelChallan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM challans WHERE id=$1', [req.params.id]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Challan not found' }); }
    if (rows[0].status === 'cancelled') { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Challan is already cancelled' }); }

    if (rows[0].status === 'confirmed') {
      const { rows: items } = await client.query('SELECT * FROM challan_items WHERE challan_id=$1', [req.params.id]);
      const qtyMap: Record<number, number> = {};
      for (const item of items) qtyMap[item.product_id] = (qtyMap[item.product_id] || 0) + Number(item.qty);
      for (const [productId, qty] of Object.entries(qtyMap)) {
        await client.query('UPDATE products SET stock_qty = stock_qty + $1 WHERE id=$2', [qty, productId]);
        await client.query(
          `INSERT INTO stock_movements (product_id, qty, movement_type, reason, created_by) VALUES ($1,$2,'IN',$3,$4)`,
          [productId, qty, `Cancelled Challan ${rows[0].challan_number}`, req.user?.id]
        );
      }
    }

    const { rows: updated } = await client.query("UPDATE challans SET status='cancelled' WHERE id=$1 RETURNING *", [req.params.id]);
    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
