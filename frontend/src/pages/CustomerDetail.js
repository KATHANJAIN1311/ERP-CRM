import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer, addCustomerNote } from '../api/services';
import './CustomerDetail.css';

const InfoRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className="info-value">{value || '—'}</span>
  </div>
);

const STATUS_COLORS = { lead: 'badge-lead', active: 'badge-active', inactive: 'badge-inactive' };
const TYPE_COLORS = { retail: 'badge-retail', wholesale: 'badge-wholesale', distributor: 'badge-distributor' };

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    getCustomer(id).then(({ data }) => {
      setCustomer(data);
      setNotes(data.customer_notes || []);
    });
  };

  useEffect(() => { load(); }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addCustomerNote(id, note.trim());
      setNote('');
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return <div className="loading">Loading...</div>;

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate('/customers')}>← Back to Customers</button>

      <div className="detail-header">
        <div>
          <h2 className="detail-name">{customer.name}</h2>
          {customer.business_name && <p className="detail-business">{customer.business_name}</p>}
        </div>
        <div className="detail-badges">
          <span className={`badge ${STATUS_COLORS[customer.status]}`}>{customer.status}</span>
          <span className={`badge ${TYPE_COLORS[customer.customer_type]}`}>{customer.customer_type}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3 className="card-title">Contact Information</h3>
          <InfoRow label="Mobile" value={customer.mobile || customer.phone} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Address" value={customer.address} />
        </div>

        <div className="detail-card">
          <h3 className="card-title">Business Details</h3>
          <InfoRow label="Business Name" value={customer.business_name} />
          <InfoRow label="GST Number" value={customer.gstin} />
          <InfoRow label="Customer Type" value={customer.customer_type} />
          <InfoRow label="Follow-up Date" value={customer.followup_date ? new Date(customer.followup_date).toLocaleDateString('en-IN') : null} />
        </div>

        {customer.notes && (
          <div className="detail-card full-width-card">
            <h3 className="card-title">Notes</h3>
            <p className="customer-notes-text">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="followup-section">
        <h3 className="section-title">Follow-up Notes</h3>

        <form onSubmit={handleAddNote} className="note-form">
          <textarea
            placeholder="Add a follow-up note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            required
          />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add Note'}
          </button>
        </form>

        <div className="notes-list">
          {notes.length === 0 && <p className="no-notes">No follow-up notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="note-item">
              <p className="note-text">{n.note}</p>
              <div className="note-meta">
                <span>{n.created_by_name || 'Unknown'}</span>
                <span>{new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
