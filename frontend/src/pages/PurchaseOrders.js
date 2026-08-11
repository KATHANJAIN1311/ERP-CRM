import { useEffect, useState } from 'react';
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, getProducts } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', order_date: '', notes: '' });
  const [items, setItems] = useState([{ product_id: '', qty: '', unit_price: '' }]);

  const load = () => getPurchaseOrders().then(({ data }) => setOrders(data.data || []));
  useEffect(() => {
    load();
    getProducts().then(({ data }) => setProducts(data.data || []));
  }, []);

  const addItem = () => setItems([...items, { product_id: '', qty: '', unit_price: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i][field] = val;
    if (field === 'product_id') {
      const p = products.find((p) => p.id === Number(val));
      if (p) updated[i].unit_price = p.purchase_price;
    }
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createPurchaseOrder({ ...form, items });
    setModal(false);
    setForm({ supplier_name: '', order_date: '', notes: '' });
    setItems([{ product_id: '', qty: '', unit_price: '' }]);
    load();
  };

  const handleReceive = async (id) => {
    if (window.confirm('Mark as received and update stock?')) {
      await receivePurchaseOrder(id);
      load();
    }
  };

  const total = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Purchase Orders</h2>
        <button className="btn-primary" onClick={() => setModal(true)}>+ New PO</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No purchase orders yet</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.po_number}</strong></td>
                <td>{o.supplier_name}</td>
                <td>{new Date(o.order_date).toLocaleDateString('en-IN')}</td>
                <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                <td>
                  {o.status === 'pending' && (
                    <button className="btn-sm success" onClick={() => handleReceive(o.id)}>Receive</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="New Purchase Order" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input placeholder="Supplier Name *" required value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
              <input type="date" required value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="full-col" />
            </div>
            <div className="items-section">
              <h4>Items</h4>
              {items.map((item, i) => (
                <div className="item-row" key={i}>
                  <select value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)} required>
                    <option value="">Select Product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} required min="1" />
                  <input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} required />
                  <button type="button" className="remove-btn" onClick={() => removeItem(i)}>✕</button>
                </div>
              ))}
              <button type="button" className="add-item-btn" onClick={addItem}>+ Add Item</button>
            </div>
            <div style={{ textAlign: 'right', margin: '12px 0', fontWeight: 700 }}>
              Total: ₹{total.toLocaleString('en-IN')}
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create PO</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
