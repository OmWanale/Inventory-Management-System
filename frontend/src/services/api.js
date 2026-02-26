import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getLowStockAlerts: () => api.get('/dashboard/low-stock-alerts'),
  getRecentTransactions: () => api.get('/dashboard/recent-transactions'),
  getChartData: (months) => api.get('/dashboard/chart-data', { params: { months } }),
  getTopProducts: () => api.get('/dashboard/top-products'),
  getCategoryDistribution: () => api.get('/dashboard/category-distribution'),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getLowStock: () => api.get('/products/low-stock'),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
};

// Vendor APIs
export const vendorAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  getList: () => api.get('/vendors/list'),
  getHistory: (id, params) => api.get(`/vendors/${id}/history`, { params }),
};

// Customer APIs
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getList: () => api.get('/customers/list'),
  getHistory: (id, params) => api.get(`/customers/${id}/history`, { params }),
};

// Purchase APIs
export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  updatePayment: (id, data) => api.patch(`/purchases/${id}/payment`, data),
  updateOrderStatus: (id, data) => api.patch(`/purchases/${id}/order-status`, data),
  markAsReceived: (id) => api.post(`/purchases/${id}/receive`),
  recordPayment: (id, data) => api.post(`/purchases/${id}/record-payment`, data),
  getPayments: (id) => api.get(`/purchases/${id}/payments`),
  delete: (id) => api.delete(`/purchases/${id}`),
  getPdf: (id) => api.get(`/purchases/${id}/pdf`, { responseType: 'blob' }),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  updatePayment: (id, data) => api.patch(`/invoices/${id}/payment`, data),
  recordPayment: (id, data) => api.post(`/invoices/${id}/record-payment`, data),
  getPayments: (id) => api.get(`/invoices/${id}/payments`),
  delete: (id) => api.delete(`/invoices/${id}`),
  getPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Report APIs
export const reportAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getPurchases: (params) => api.get('/reports/purchases', { params }),
  getProfitLoss: (params) => api.get('/reports/profit-loss', { params }),
  getStock: () => api.get('/reports/stock'),
  exportSales: (params) => api.get('/reports/export', { params: { ...params, type: 'sales' }, responseType: 'blob' }),
  exportPurchases: (params) => api.get('/reports/export', { params: { ...params, type: 'purchases' }, responseType: 'blob' }),
  exportProfitLoss: (params) => api.get('/reports/export', { params: { ...params, type: 'profit-loss' }, responseType: 'blob' }),
  exportStock: () => api.get('/reports/export', { params: { type: 'stock' }, responseType: 'blob' }),
};

// Settings APIs
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// User APIs
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  getAuditLogs: (params) => api.get('/users/audit-logs', { params }),
};

// Inventory APIs
export const inventoryAPI = {
  getMovements: (params) => api.get('/inventory/movements', { params }),
  getSummary: () => api.get('/inventory/summary'),
  getProductHistory: (productId, params) => api.get(`/inventory/product/${productId}/history`, { params }),
};

export default api;
