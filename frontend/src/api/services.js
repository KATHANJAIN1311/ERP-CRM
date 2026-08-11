import api from './axios';

// Auth
export const login = (data) => api.post('/auth/login', data);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Customers
export const getCustomers = (search = '') => api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const addCustomerNote = (id, note) => api.post(`/customers/${id}/notes`, { note });

// Products
export const getProducts = () => api.get('/products');
export const getLowStock = () => api.get('/products/low-stock');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getStockMovements = (id) => api.get(`/products/${id}/movements`);
export const addStockMovement = (id, data) => api.post(`/products/${id}/movements`, data);

// Purchase Orders
export const getPurchaseOrders = () => api.get('/purchase-orders');
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`);
export const createPurchaseOrder = (data) => api.post('/purchase-orders', data);
export const receivePurchaseOrder = (id) => api.patch(`/purchase-orders/${id}/receive`);

// Challans
export const getChallans = () => api.get('/challans');
export const getChallan = (id) => api.get(`/challans/${id}`);
export const createChallan = (data) => api.post('/challans', data);
export const confirmChallan = (id) => api.patch(`/challans/${id}/confirm`);
export const cancelChallan = (id) => api.patch(`/challans/${id}/cancel`);

// Invoices
export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const recordPayment = (id, amount) => api.patch(`/invoices/${id}/payment`, { amount });
export const getOverdueInvoices = () => api.get('/invoices/overdue');

// CRM
export const getFollowups = () => api.get('/crm');
export const getTodayFollowups = () => api.get('/crm/today');
export const createFollowup = (data) => api.post('/crm', data);
export const updateFollowupStatus = (id, status, notes) => api.patch(`/crm/${id}/status`, { status, notes });

// Accounts
export const getFinancialSummary = () => api.get('/accounts/summary');
export const getExpenses = () => api.get('/accounts/expenses');
export const createExpense = (data) => api.post('/accounts/expenses', data);
export const getPaymentRecords = () => api.get('/accounts/payments');
