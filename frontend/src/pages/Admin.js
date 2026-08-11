import { useEffect, useState } from 'react';
import { getDashboard, getCustomers, getProducts, getInvoices, getExpenses } from '../api/services';
import './Page.css';
import './Admin.css';

const ROLE_INFO = [
  { role: 'Admin',     email: 'admin@company.com',     pass: 'Admin@123',     color: '#a855f7', icon: '🛡️', access: 'Full system access' },
  { role: 'Sales',     email: 'sales@company.com',     pass: 'Sales@123',     color: '#0ea5e9', icon: '📈', access: 'Customers, Challans, Invoices, CRM' },
  { role: 'Warehouse', email: 'warehouse@company.com', pass: 'Warehouse@123', color: '#f97316', icon: '🏭', access: 'Products, Stock, Purchase Orders, Challans' },
  { role: 'Accounts',  email: 'accounts@company.com',  pass: 'Accounts@123',  color: '#22c55e', icon: '💼', access: 'Invoices, Expenses, Payments, Financial Reports' },
];

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    getDashboard().then(({ data }) => { setStats(data); setLowStockCount(data.low_stock_count); });
    getInvoices().then(({ data }) => setRecentInvoices((data.data || []).slice(0, 8)));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Admin Panel</h2>
        <div className="admin-badge">🛡️ Full Access</div>
      </div>

      <div className="admin-tabs">
        {['overview', 'credentials', 'system'].map((t) => (
          <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div>
          <div className="admin-stats-grid">
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#38bdf8' }}>◉</div>
              <div className="admin-stat-val">{stats.total_customers}</div>
              <div className="admin-stat-lbl">Customers</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#4ade80' }}>⬡</div>
              <div className="admin-stat-val">{stats.total_products}</div>
              <div className="admin-stat-lbl">Products</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#f87171' }}>◈</div>
              <div className="admin-stat-val">{stats.unpaid_invoices}</div>
              <div className="admin-stat-lbl">Unpaid Invoices</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#fb923c' }}>◆</div>
              <div className="admin-stat-val">₹{Number(stats.outstanding_amount).toLocaleString('en-IN')}</div>
              <div className="admin-stat-lbl">Outstanding</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#fbbf24' }}>⚠</div>
              <div className="admin-stat-val">{stats.low_stock_count}</div>
              <div className="admin-stat-lbl">Low Stock</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat-icon" style={{ color: '#c084fc' }}>◷</div>
              <div className="admin-stat-val">{stats.today_followups}</div>
              <div className="admin-stat-lbl">Today's Follow-ups</div>
            </div>
          </div>

          <h3 className="admin-section-title">Recent Invoices</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice No.</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ color: '#e2e8f0', fontWeight: 700 }}>{inv.invoice_number}</td>
                    <td>{inv.customer_name}</td>
                    <td>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                    <td>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#4ade80' }}>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#334155', padding: '24px' }}>No invoices yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'credentials' && (
        <div>
          <p style={{ color: '#475569', marginBottom: 20, fontSize: '0.875rem' }}>
            Default login credentials for each role. Change passwords after first login.
          </p>
          <div className="cred-grid">
            {ROLE_INFO.map((r) => (
              <div key={r.role} className="cred-card" style={{ '--rc': r.color }}>
                <div className="cred-header">
                  <span className="cred-icon">{r.icon}</span>
                  <span className="cred-role" style={{ color: r.color }}>{r.role}</span>
                </div>
                <div className="cred-row">
                  <span className="cred-key">Email</span>
                  <code className="cred-val">{r.email}</code>
                </div>
                <div className="cred-row">
                  <span className="cred-key">Password</span>
                  <code className="cred-val">{r.pass}</code>
                </div>
                <div className="cred-access">{r.access}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="admin-system">
          <div className="sys-card">
            <div className="sys-card-title">🗄️ Database</div>
            <div className="sys-card-body">PostgreSQL — All tables migrated and seeded</div>
          </div>
          <div className="sys-card">
            <div className="sys-card-title">🔐 Authentication</div>
            <div className="sys-card-body">JWT — Role-based access control (RBAC) active</div>
          </div>
          <div className="sys-card">
            <div className="sys-card-title">📦 Modules Active</div>
            <div className="sys-card-body">Sales · Warehouse · Accounts · CRM · Admin</div>
          </div>
          <div className="sys-card">
            <div className="sys-card-title">🌐 API</div>
            <div className="sys-card-body">REST API — Express.js + TypeScript backend</div>
          </div>
        </div>
      )}
    </div>
  );
}
