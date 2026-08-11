import { useEffect, useState } from 'react';
import { getChallans, getChallan, createChallan, confirmChallan, cancelChallan, getCustomers, getProducts } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';

const emptyForm = { customer_id: '', challan_date: new Date().toISOString().slice(0, 10), notes: '' };
const emptyItem = { product_id: '', qty: '', unit_price: '' };

const statusColor = { draft: '#94a3b8', confirmed: '#16a34a', cancelled: '#dc2626' };

export default function Challans() {
  const [challans, setChallans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  const load = () => getChallans().then(({ data }) => setChallans(data.data || []));

  useEffect(() => {
    load();
    getCustomers().then(({ data }) => setCustomers(data.data || []));
    getProducts().then(({ data }) => setProducts(data.data || []));
  }, []);

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    if (field === 'product_id') {
      const p = products.find((p) => String(p.id) === String(val));
      if (p) updated[i].unit_price = p.selling_price;
    }
    setItems(updated);
  };

  const totalAmount = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const handleSubmit = async (e, submitAs) => {
    e.preventDefault();
    setError('');
    try {
      await createChallan({ ...form, items, status: submitAs });
      setModal(false);
      setForm(emptyForm);
      setItems([{ ...emptyItem }]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create challan');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await confirmChallan(id);
      load();
      if (detail?.id === id) openDetail(id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this challan? Stock will be restored if it was confirmed.')) return;
    try {
      await cancelChallan(id);
      load();
      if (detail?.id === id) openDetail(id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const openDetail = async (id) => {
    const { data } = await getChallan(id);
    setDetail(data);
    setDetailModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Sales Challans</h2>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setItems([{ ...emptyItem }]); setError(''); setModal(true); }}>
          + New Challan
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Challan No.</th><th>Customer</th><th>Date</th><th>Total Qty</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {challans.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.challan_number}</strong></td>
                <td>{c.customer_name}</td>
                <td>{new Date(c.challan_date).toLocaleDateString('en-IN')}</td>
                <td>{c.total_qty}</td>
                <td>₹{Number(c.total_amount).toLocaleString('en-IN')}</td>
                <td>
                  <span className="badge" style={{ background: statusColor[c.status] + '22', color: statusColor[c.status] }}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <button className="btn-sm" onClick={() => openDetail(c.id)}>View</button>
                  {c.status === 'draft' && (
                    <button className="btn-sm success" onClick={() => handleConfirm(c.id)}>Confirm</button>
                  )}
                  {c.status !== 'cancelled' && (
                    <button className="btn-sm danger" onClick={() => handleCancel(c.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {challans.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>No challans yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modal && (
        <Modal title="New Sales Challan" onClose={() => setModal(false)}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}
          <form>
            <div className="form-grid">
              <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Select Customer *</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" required value={form.challan_date} onChange={(e) => setForm({ ...form, challan_date: e.target.value })} />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="full-col" rows={2} />
            </div>

            <div className="items-section">
              <h4>Items</h4>
              {items.map((item, i) => (
                <div className="item-row" key={i}>
                  <select value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)} required>
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock_qty} {p.unit}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Qty" min="0.01" step="any" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} required />
                  <input type="number" placeholder="Unit Price" min="0" step="any" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} required />
                  <button type="button" className="remove-btn" onClick={() => removeItem(i)}>✕</button>
                </div>
              ))}
              <button type="button" className="add-item-btn" onClick={addItem}>+ Add Item</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0 4px', fontSize: '0.9rem', color: '#475569' }}>
              <span>Total Qty: <strong>{totalQty}</strong></span>
              <span>Total: <strong>₹{totalAmount.toLocaleString('en-IN')}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, background: '#64748b' }}
                onClick={(e) => handleSubmit(e, 'draft')}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={(e) => handleSubmit(e, 'confirmed')}
              >
                Confirm & Deduct Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailModal && detail && (
        <Modal title={`Challan: ${detail.challan_number}`} onClose={() => setDetailModal(false)}>
          <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <span><strong>Customer:</strong> {detail.customer_name}</span>
            <span><strong>Date:</strong> {new Date(detail.challan_date).toLocaleDateString('en-IN')}</span>
            <span>
              <strong>Status:</strong>{' '}
              <span style={{ color: statusColor[detail.status], fontWeight: 600, textTransform: 'capitalize' }}>{detail.status}</span>
            </span>
            <span><strong>Created by:</strong> {detail.created_by_name || '—'}</span>
            {detail.notes && <span style={{ gridColumn: '1/-1' }}><strong>Notes:</strong> {detail.notes}</span>}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Unit</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {detail.items?.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_name}</td>
                    <td><code>{it.product_sku}</code></td>
                    <td>{it.product_unit}</td>
                    <td>{it.qty}</td>
                    <td>₹{Number(it.unit_price).toLocaleString('en-IN')}</td>
                    <td>₹{Number(it.total).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                  <td><strong>{detail.total_qty}</strong></td>
                  <td></td>
                  <td><strong>₹{Number(detail.total_amount).toLocaleString('en-IN')}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            {detail.status === 'draft' && (
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleConfirm(detail.id)}>
                Confirm & Deduct Stock
              </button>
            )}
            {detail.status !== 'cancelled' && (
              <button className="btn-sm danger" style={{ flex: 1, padding: '9px' }} onClick={() => handleCancel(detail.id)}>
                Cancel Challan
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
