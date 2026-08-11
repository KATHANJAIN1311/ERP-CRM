import pool from './db';

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Phase 1: Core tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'sales' CHECK (role IN ('admin','sales','warehouse','accounts')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(80),
        gstin VARCHAR(20),
        credit_limit NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        sku VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(80),
        unit VARCHAR(20) DEFAULT 'pcs',
        purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
        stock_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
        low_stock_alert NUMERIC(12,2) DEFAULT 10,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_name VARCHAR(150) NOT NULL,
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','received','cancelled')),
        total_amount NUMERIC(14,2) DEFAULT 0,
        notes TEXT,
        created_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        qty NUMERIC(12,2) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        total NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED
      );

      CREATE TABLE IF NOT EXISTS challans (
        id SERIAL PRIMARY KEY,
        challan_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INT NOT NULL REFERENCES customers(id),
        challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','confirmed','cancelled')),
        total_qty NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(14,2) DEFAULT 0,
        notes TEXT,
        created_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS challan_items (
        id SERIAL PRIMARY KEY,
        challan_id INT NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        product_name VARCHAR(150) NOT NULL,
        product_sku VARCHAR(50) NOT NULL,
        product_unit VARCHAR(20) NOT NULL,
        qty NUMERIC(12,2) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        total NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INT NOT NULL REFERENCES customers(id),
        challan_id INT REFERENCES challans(id),
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        subtotal NUMERIC(14,2) DEFAULT 0,
        tax_percent NUMERIC(5,2) DEFAULT 18,
        tax_amount NUMERIC(14,2) DEFAULT 0,
        total_amount NUMERIC(14,2) DEFAULT 0,
        paid_amount NUMERIC(14,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
        notes TEXT,
        created_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_followups (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id),
        assigned_to INT REFERENCES users(id),
        followup_date DATE NOT NULL,
        type VARCHAR(30) DEFAULT 'call' CHECK (type IN ('call','email','meeting','whatsapp')),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Phase 2: Challan schema upgrades for existing DBs (safe to run multiple times)
    await client.query(`
      ALTER TABLE challans
        ADD COLUMN IF NOT EXISTS total_qty NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0;

      ALTER TABLE challan_items
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS product_sku VARCHAR(50),
        ADD COLUMN IF NOT EXISTS product_unit VARCHAR(20);
    `);

    // Phase 3: Product location + stock movements
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS location VARCHAR(100);

      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        qty NUMERIC(12,2) NOT NULL,
        movement_type VARCHAR(3) NOT NULL CHECK (movement_type IN ('IN','OUT')),
        reason TEXT,
        created_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Phase 4: CRM columns on customers (safe to run multiple times)
    await client.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS mobile VARCHAR(20),
        ADD COLUMN IF NOT EXISTS business_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'retail',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'lead',
        ADD COLUMN IF NOT EXISTS followup_date DATE,
        ADD COLUMN IF NOT EXISTS notes TEXT;

      CREATE TABLE IF NOT EXISTS customer_notes (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
