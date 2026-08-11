import { useEffect, useState } from 'react';
import { getFollowups, createFollowup, updateFollowupStatus, getCustomers } from '../api/services';
import Modal from '../components/Modal';
import './Page.css';

export default function CRM() {
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', followup_date: '', type: 'call', notes: '' });
  const [filter, setFilter] = useState('all');

  const load = () => getFollowups().then(({ data }) => setFollowups(data.data || []));
  useEffect(() => {
    load();
    getCustomers().then(({ data }) => setCustomers(data.data || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createFollowup(form);
    setModal(false);
    setForm({ customer_id: '', followup_date: '', type: 'call', notes: '' });
    load();
  };

  const markDone = async (id) => {
    await updateFollowupStatus(id, 'done', '');
    load();
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = followups.filter((f) => {
    if (filter === 'today') return f.followup_date?.split('T')[0] === today;
    if (filter === 'pending') return f.status === 'pending';
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">CRM Follow-ups</h2>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Add Follow-up</button>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        {['all', 'today', 'pending'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === f ? '#0ea5e9' : '#e2e8f0', color: filter === f ? 'white' : '#475569', fontWeight: 600 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Customer</th><th>Date</th><th>Type</th><th>Notes</th><th>Assigned To</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>{f.customer_name}</td>
                <td>{new Date(f.followup_date).toLocaleDateString('en-IN')}</td>
                <td><span className={`badge ${f.type}`}>{f.type}</span></td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes}</td>
                <td>{f.assigned_to_name}</td>
                <td><span className={`badge ${f.status}`}>{f.status}</span></td>
                <td>
                  {f.status === 'pending' && (
                    <button className="btn-sm success" onClick={() => markDone(f.id)}>Mark Done</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Add Follow-up" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select Customer *</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.mobile || c.phone || ''}</option>)}
            </select>
            <input type="date" required value={form.followup_date} onChange={(e) => setForm({ ...form, followup_date: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['call', 'email', 'meeting', 'whatsapp'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <div />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="full-col" />
            <button type="submit" className="btn-primary full-col">Create Follow-up</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
