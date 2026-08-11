import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';
import './Customers.css';

const EMPTY = {
  name: '', mobile: '', email: '', business_name: '', gstin: '',
  customer_type: 'retail', address: '', status: 'lead', followup_date: '', notes: ''
};

const STATUS_COLORS = { lead: 'badge-lead', active: 'badge-active', inactive: 'badge-inactive' };
const TYPE_COLORS = { retail: 'badge-retail', wholesale: 'badge-wholesale', distributor: 'badge-distributor' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback((q = '') => {
    getCustomers(q).then(({ data }) => setCustomers(data.data || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (e, c) => {
    e.stopPropagation();
    setForm({ ...EMPTY, ...c, followup_date: c.followup_date ? c.followup_date.split('T')[0] : '' });
    setEditing(c.id);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) await updateCustomer(editing, form);
      else await createCustomer(form);
      setModal(false);
      load(search);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this customer?')) {
      await deleteCustomer(id);
      load(search);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Customers</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      <input
        className="search-input"
        placeholder="Search by name, mobile, business or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No customers found</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="clickable-row" onClick={() => navigate(`/customers/${c.id}`)}>
                <td>
                  <div className="customer-name">{c.name}</div>
                  {c.email && <div className="customer-sub">{c.email}</div>}
                </td>
                <td>{c.mobile || c.phone || '—'}</td>
                <td>{c.business_name || '—'}</td>
                <td><span className={`badge ${TYPE_COLORS[c.customer_type] || ''}`}>{c.customer_type || 'retail'}</span></td>
                <td><span className={`badge ${STATUS_COLORS[c.status] || ''}`}>{c.status || 'lead'}</span></td>
                <td>{c.followup_date ? new Date(c.followup_date).toLocaleDateString('en-IN') : '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button className="btn-sm" onClick={(e) => openEdit(e, c)}>Edit</button>
                  <button className="btn-sm danger" onClick={(e) => handleDelete(e, c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field">
              <label>Customer Name *</label>
              <input placeholder="Full name" required value={form.name} onChange={set('name')} />
            </div>
            <div className="form-field">
              <label>Mobile *</label>
              <input placeholder="Mobile number" required value={form.mobile} onChange={set('mobile')} />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-field">
              <label>Business Name</label>
              <input placeholder="Business / company name" value={form.business_name} onChange={set('business_name')} />
            </div>
            <div className="form-field">
              <label>GST Number (optional)</label>
              <input placeholder="GSTIN" value={form.gstin} onChange={set('gstin')} />
            </div>
            <div className="form-field">
              <label>Customer Type</label>
              <select value={form.customer_type} onChange={set('customer_type')}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-field">
              <label>Follow-up Date</label>
              <input type="date" value={form.followup_date} onChange={set('followup_date')} />
            </div>
            <div className="form-field full-col">
              <label>Address</label>
              <textarea placeholder="Full address" rows={2} value={form.address} onChange={set('address')} />
            </div>
            <div className="form-field full-col">
              <label>Notes</label>
              <textarea placeholder="Any notes about this customer" rows={2} value={form.notes} onChange={set('notes')} />
            </div>
            <button type="submit" className="btn-primary full-col" disabled={loading}>
              {loading ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
