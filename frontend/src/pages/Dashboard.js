import { useEffect, useState } from 'react';
import { getDashboard } from '../api/services';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const StatCard = ({ label, value, color, prefix, icon }) => (
  <div className={`stat-card stat-${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{prefix}{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(({ data }) => { setStats(data); setLoading(false); })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="loading" style={{ color: '#f87171' }}>{error}</div>;

  return (
    <div>
      <div className="dash-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="dash-sub">Welcome back, {user?.name}</p>
        </div>
        <div className="dash-role-badge">{user?.role}</div>
      </div>
      <div className="stats-grid">
        <StatCard icon="◉" label="Total Customers"    value={stats.total_customers}  color="blue"   />
        <StatCard icon="⬡" label="Total Products"     value={stats.total_products}   color="green"  />
        <StatCard icon="◈" label="Unpaid Invoices"    value={stats.unpaid_invoices}  color="orange" />
        <StatCard icon="◆" label="Outstanding"        value={Number(stats.outstanding_amount).toLocaleString('en-IN')} prefix="₹" color="red" />
        <StatCard icon="⚠" label="Low Stock Items"    value={stats.low_stock_count}  color="yellow" />
        <StatCard icon="⏰" label="Overdue Invoices"  value={stats.overdue_invoices} color="red"    />
        <StatCard icon="◷" label="Today's Follow-ups" value={stats.today_followups}  color="purple" />
      </div>
    </div>
  );
}
