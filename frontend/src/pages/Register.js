import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/services';
import './Login.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>ERP / CRM</h1>
        <p>Create a new account</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input placeholder="Full Name" required value={form.name} onChange={set('name')} />
          <input type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
          <input type="password" placeholder="Password (min 6 chars)" required minLength={6} value={form.password} onChange={set('password')} />
          <select value={form.role} onChange={set('role')}>
            <option value="sales">Sales</option>
            <option value="warehouse">Warehouse</option>
            <option value="accounts">Accounts</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
