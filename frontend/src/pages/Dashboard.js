import { useEffect, useState } from 'react';
import { getDashboard } from '../api/services';
import './Dashboard.css';

const StatCard = ({ label, value, color, prefix }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-value">{prefix}{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(({ data }) => { setStats(data); setLoading(false); })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="loading" style={{ color: '#ef4444' }}>{error}</div>;

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <div className="stats-grid">
        <StatCard label="Total Customers" value={stats.total_customers} color="blue" />
        <StatCard label="Total Products" value={stats.total_products} color="green" />
        <StatCard label="Unpaid Invoices" value={stats.unpaid_invoices} color="orange" />
        <StatCard label="Outstanding Amount" value={Number(stats.outstanding_amount).toLocaleString('en-IN')} prefix="₹" color="red" />
        <StatCard label="Low Stock Items" value={stats.low_stock_count} color="yellow" />
        <StatCard label="Overdue Invoices" value={stats.overdue_invoices} color="red" />
        <StatCard label="Today's Follow-ups" value={stats.today_followups} color="purple" />
      </div>
    </div>
  );
}
