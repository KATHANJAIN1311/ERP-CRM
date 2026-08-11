import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const ROLES = [
  { key: 'admin',     label: 'Admin',     icon: '🛡️', email: 'admin@company.com',     color: '#a855f7' },
  { key: 'sales',     label: 'Sales',     icon: '📈', email: 'sales@company.com',     color: '#0ea5e9' },
  { key: 'warehouse', label: 'Warehouse', icon: '🏭', email: 'warehouse@company.com', color: '#f97316' },
  { key: 'accounts',  label: 'Accounts',  icon: '💼', email: 'accounts@company.com',  color: '#22c55e' },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError('');
    setLoading(true);
    try {
      await login(selectedRole.email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">⚡</div>
          <h1>FundsRoom ERP</h1>
          <p>Select your role to continue</p>
        </div>

        <div className="role-grid">
          {ROLES.map((role) => (
            <button
              key={role.key}
              className={`role-card${selectedRole?.key === role.key ? ' selected' : ''}`}
              style={{ '--role-color': role.color }}
              onClick={() => handleRoleSelect(role)}
              type="button"
            >
              <span className="role-icon">{role.icon}</span>
              <span className="role-label">{role.label}</span>
              {selectedRole?.key === role.key && <span className="role-check">✓</span>}
            </button>
          ))}
        </div>

        {selectedRole && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-header">
              <span style={{ color: selectedRole.color }}>{selectedRole.icon}</span>
              <span>{selectedRole.label} Login</span>
            </div>
            <div className="input-group">
              <span className="input-icon">✉</span>
              <input
                type="text"
                value={selectedRole.email}
                readOnly
                className="input-readonly"
              />
            </div>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Enter password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button
              type="submit"
              className="login-btn"
              style={{ '--role-color': selectedRole.color }}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>Sign In as {selectedRole.label} →</>
              )}
            </button>
          </form>
        )}

        <div className="login-footer">
          Secure · Role-Based Access · ERP System
        </div>
      </div>
    </div>
  );
}
