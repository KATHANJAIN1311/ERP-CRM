import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_BY_ROLE = {
  admin: [
    { to: '/',         label: 'Dashboard',      icon: '◈' },
    { to: '/admin',    label: 'Admin Panel',     icon: '🛡' },
    { to: '/customers',label: 'Customers',       icon: '◉' },
    { to: '/products', label: 'Products',        icon: '⬡' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '◎' },
    { to: '/challans', label: 'Challans',        icon: '◷' },
    { to: '/invoices', label: 'Invoices',        icon: '◈' },
    { to: '/accounts', label: 'Accounts',        icon: '◆' },
    { to: '/crm',      label: 'CRM',             icon: '◉' },
    { to: '/warehouse',label: 'Warehouse',       icon: '⬡' },
  ],
  sales: [
    { to: '/',         label: 'Dashboard',       icon: '◈' },
    { to: '/customers',label: 'Customers',       icon: '◉' },
    { to: '/challans', label: 'Challans',        icon: '◷' },
    { to: '/invoices', label: 'Invoices',        icon: '◈' },
    { to: '/crm',      label: 'CRM Follow-ups',  icon: '◉' },
  ],
  warehouse: [
    { to: '/',          label: 'Dashboard',      icon: '◈' },
    { to: '/warehouse', label: 'Warehouse',      icon: '⬡' },
    { to: '/products',  label: 'Products',       icon: '⬡' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '◎' },
    { to: '/challans',  label: 'Challans',       icon: '◷' },
  ],
  accounts: [
    { to: '/',          label: 'Dashboard',      icon: '◈' },
    { to: '/accounts',  label: 'Accounts',       icon: '◆' },
    { to: '/invoices',  label: 'Invoices',       icon: '◈' },
    { to: '/challans',  label: 'Challans',       icon: '◷' },
  ],
};

const ROLE_COLORS = {
  admin:     '#a855f7',
  sales:     '#0ea5e9',
  warehouse: '#f97316',
  accounts:  '#22c55e',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.sales;
  const roleColor = ROLE_COLORS[user?.role] || '#0ea5e9';

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setOpen(false);

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">⚡</span>
          <span>FundsRoom</span>
        </div>

        <div className="sidebar-user" style={{ '--role-color': roleColor }}>
          <div className="sidebar-avatar" style={{ background: roleColor }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="sidebar-name">{user?.name}</div>
            <div className="sidebar-role" style={{ color: roleColor }}>{user?.role}</div>
          </div>
        </div>

        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => isActive ? { '--active-color': roleColor } : {}}
              onClick={close}
            >
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span>⏻</span> Sign Out
        </button>
      </aside>
    </>
  );
}
