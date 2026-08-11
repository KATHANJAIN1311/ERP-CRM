import { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, getStockMovements, addStockMovement } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';

const empty = { name: '', sku: '', category: '', unit: 'pcs', purchase_price: '', selling_price: '', stock_qty: '', low_stock_alert: 10, location: '' };
const emptyMove = { qty: '', movement_type: 'IN', reason: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [logProduct, setLogProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [moveForm, setMoveForm] = useState(emptyMove);
  const [moveModal, setMoveModal] = useState(false);

  const load = () => getProducts().then(({ data }) => setProducts(data.data || []));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (p) => { setForm(p); setEditing(p.id); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) await updateProduct(editing, form);
    else await createProduct(form);
    setModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) { await deleteProduct(id); load(); }
  };

  const openLog = async (p) => {
    setLogProduct(p);
    const { data } = await getStockMovements(p.id);
    setMovements(data.data || []);
    setMoveForm(emptyMove);
    setMoveModal(true);
  };

  const handleAddMovement = async (e) => {
    e.preventDefault();
    await addStockMovement(logProduct.id, moveForm);
    const { data } = await getStockMovements(logProduct.id);
    setMovements(data.data || []);
    setMoveForm(emptyMove);
    load();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Products</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>
      <input className="search-input" placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>SKU</th><th>Category</th><th>Unit</th><th>Buy Price</th><th>Sell Price</th><th>Stock</th><th>Min Alert</th><th>Location</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No products found</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} style={Number(p.stock_qty) <= Number(p.low_stock_alert) ? { background: '#fff7ed' } : {}}>
                <td>{p.name}</td>
                <td><code>{p.sku}</code></td>
                <td>{p.category}</td>
                <td>{p.unit}</td>
                <td>₹{Number(p.purchase_price).toLocaleString('en-IN')}</td>
                <td>₹{Number(p.selling_price).toLocaleString('en-IN')}</td>
                <td>
                  {p.stock_qty} {Number(p.stock_qty) <= Number(p.low_stock_alert) && <span style={{ color: '#f97316', fontSize: '0.75rem' }}>⚠ Low</span>}
                </td>
                <td>{p.low_stock_alert}</td>
                <td>{p.location || '—'}</td>
                <td>
                  <button className="btn-sm" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn-sm" onClick={() => openLog(p)}>Log</button>
                  <button className="btn-sm danger" onClick={() => handleDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <input placeholder="Product Name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="SKU *" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <input placeholder="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {['pcs', 'kg', 'ltr', 'box', 'mtr', 'dozen'].map((u) => <option key={u}>{u}</option>)}
            </select>
            <input type="number" placeholder="Purchase Price *" required value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            <input type="number" placeholder="Selling Price *" required value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            <input type="number" placeholder="Opening Stock" value={form.stock_qty || ''} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            <input type="number" placeholder="Low Stock Alert" value={form.low_stock_alert || ''} onChange={(e) => setForm({ ...form, low_stock_alert: e.target.value })} />
            <input placeholder="Location / Warehouse" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ gridColumn: '1 / -1' }} />
            <button type="submit" className="btn-primary full-col">{editing ? 'Update' : 'Create'}</button>
          </form>
        </Modal>
      )}

      {moveModal && logProduct && (
        <Modal title={`Stock Log — ${logProduct.name}`} onClose={() => setMoveModal(false)}>
          <form onSubmit={handleAddMovement} className="form-grid" style={{ marginBottom: '1rem' }}>
            <input type="number" placeholder="Quantity *" required min="0.01" step="any" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} />
            <select value={moveForm.movement_type} onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value })}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <input placeholder="Reason" value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} style={{ gridColumn: '1 / -1' }} />
            <button type="submit" className="btn-primary full-col">Add Movement</button>
          </form>
          <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>Type</th><th>Qty</th><th>Reason</th><th>By</th><th>Date</th></tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td><span style={{ color: m.movement_type === 'IN' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{m.movement_type}</span></td>
                    <td>{m.qty}</td>
                    <td>{m.reason || '—'}</td>
                    <td>{m.created_by_name || '—'}</td>
                    <td>{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
                {movements.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>No movements yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
