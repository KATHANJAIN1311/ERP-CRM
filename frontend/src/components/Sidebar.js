import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/customers', label: '👥 Customers' },
  { to: '/products', label: '📦 Products' },
  { to: '/purchase-orders', label: '🛒 Purchase Orders' },
  { to: '/challans', label: '🚚 Challans' },
  { to: '/invoices', label: '🧾 Invoices' },
  { to: '/crm', label: '📞 CRM Follow-ups' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setOpen(false);

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">ERP / CRM</div>
        <div className="sidebar-user">
          {user?.name}
          <span>{user?.role}</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={close}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
      </aside>
    </>
  );
}
