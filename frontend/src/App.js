import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import Challans from './pages/Challans';
import Invoices from './pages/Invoices';
import CRM from './pages/CRM';
import Warehouse from './pages/Warehouse';
import Accounts from './pages/Accounts';
import Admin from './pages/Admin';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute roles={['admin','sales']}><Customers /></PrivateRoute>} />
      <Route path="/customers/:id" element={<PrivateRoute roles={['admin','sales']}><CustomerDetail /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute roles={['admin','warehouse']}><Products /></PrivateRoute>} />
      <Route path="/purchase-orders" element={<PrivateRoute roles={['admin','warehouse']}><PurchaseOrders /></PrivateRoute>} />
      <Route path="/challans" element={<PrivateRoute roles={['admin','sales','warehouse','accounts']}><Challans /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute roles={['admin','sales','accounts']}><Invoices /></PrivateRoute>} />
      <Route path="/crm" element={<PrivateRoute roles={['admin','sales']}><CRM /></PrivateRoute>} />
      <Route path="/warehouse" element={<PrivateRoute roles={['admin','warehouse']}><Warehouse /></PrivateRoute>} />
      <Route path="/accounts" element={<PrivateRoute roles={['admin','accounts']}><Accounts /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><Admin /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
