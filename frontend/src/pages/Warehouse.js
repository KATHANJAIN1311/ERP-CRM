import { useEffect, useState } from 'react';
import { getProducts, getLowStock, addStockMovement, getStockMovements } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';
import './Warehouse.css';

export default function Warehouse() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState('overview');
  const [logProduct, setLogProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [moveForm, setMoveForm] = useState({ qty: '', movement_type: 'IN', reason: '' });
  const [moveModal, setMoveModal] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    getProducts().then(({ data }) => setProducts(data.data || []));
    getLowStock().then(({ data }) => setLowStock(data.data || []));
  };

  useEffect(() => { load(); }, []);

  const openLog = async (p) => {
    setLogProduct(p);
    const { data } = await getStockMovements(p.id);
    setMovements(data.data || []);
    setMoveForm({ qty: '', movement_type: 'IN', reason: '' });
    setMoveModal(true);
  };

  const handleAddMovement = async (e) => {
    e.preventDefault();
    await addStockMovement(logProduct.id, moveForm);
    const { data } = await getStockMovements(logProduct.id);
    setMovements(data.data || []);
    setMoveForm({ qty: '', movement_type: 'IN', reason: '' });
    load();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((s, p) => s + Number(p.stock_qty || 0), 0);
  const totalValue = products.reduce((s, p) => s + Number(p.stock_qty || 0) * Number(p.purchase_price || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Warehouse</h2>
      </div>

      <div className="wh-stats">
        <div className="wh-stat">
          <div className="wh-stat-val">{products.length}</div>
          <div className="wh-stat-lbl">Total SKUs</div>
        </div>
        <div className="wh-stat">
          <div className="wh-stat-val">{totalStock.toLocaleString('en-IN')}</div>
          <div className="wh-stat-lbl">Total Units</div>
        </div>
        <div className="wh-stat wh-stat-warn">
          <div className="wh-stat-val">{lowStock.length}</div>
          <div className="wh-stat-lbl">Low Stock Alerts</div>
        </div>
        <div className="wh-stat">
          <div className="wh-stat-val">₹{totalValue.toLocaleString('en-IN')}</div>
          <div className="wh-stat-lbl">Inventory Value</div>
        </div>
      </div>

      <div className="wh-tabs">
        {['overview', 'low-stock'].map((t) => (
          <button key={t} className={`wh-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? '📦 All Stock' : `⚠ Low Stock (${lowStock.length})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <input className="search-input" placeholder="Search by name, SKU, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Location</th><th>Unit</th><th>Stock</th><th>Min Alert</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isLow = Number(p.stock_qty) <= Number(p.low_stock_alert);
                  return (
                    <tr key={p.id}>
                      <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.location || <span style={{ color: '#334155' }}>—</span>}</td>
                      <td>{p.unit}</td>
                      <td style={{ color: isLow ? '#f87171' : '#4ade80', fontWeight: 700 }}>{p.stock_qty}</td>
                      <td>{p.low_stock_alert}</td>
                      <td>
                        <span className={`badge ${isLow ? 'unpaid' : 'paid'}`}>
                          {isLow ? 'Low' : 'OK'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-sm success" onClick={() => openLog(p)}>Stock Entry</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'low-stock' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Location</th><th>Current Stock</th><th>Min Alert</th><th>Shortage</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{p.name}</td>
                  <td><code>{p.sku}</code></td>
                  <td>{p.location || '—'}</td>
                  <td style={{ color: '#f87171', fontWeight: 700 }}>{p.stock_qty}</td>
                  <td>{p.low_stock_alert}</td>
                  <td style={{ color: '#fb923c' }}>{Math.max(0, Number(p.low_stock_alert) - Number(p.stock_qty))}</td>
                  <td><button className="btn-sm success" onClick={() => openLog(p)}>Restock</button></td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>All stock levels are healthy ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {moveModal && logProduct && (
        <Modal title={`Stock Entry — ${logProduct.name}`} onClose={() => setMoveModal(false)}>
          <div className="wh-current-stock">
            Current Stock: <strong style={{ color: '#4ade80' }}>{logProduct.stock_qty} {logProduct.unit}</strong>
          </div>
          <form onSubmit={handleAddMovement} className="form-grid" style={{ marginBottom: '1rem' }}>
            <select value={moveForm.movement_type} onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value })}>
              <option value="IN">IN — Receive Stock</option>
              <option value="OUT">OUT — Issue Stock</option>
            </select>
            <input type="number" placeholder="Quantity *" required min="0.01" step="any" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} />
            <input placeholder="Reason / Reference" value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} style={{ gridColumn: '1 / -1' }} />
            <button type="submit" className="btn-primary full-col">Add Entry</button>
          </form>
          <div className="table-wrap" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Type</th><th>Qty</th><th>Reason</th><th>By</th><th>Date</th></tr></thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td><span style={{ color: m.movement_type === 'IN' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{m.movement_type}</span></td>
                    <td>{m.qty}</td>
                    <td>{m.reason || '—'}</td>
                    <td>{m.created_by_name || '—'}</td>
                    <td>{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
                {movements.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#334155' }}>No movements yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
