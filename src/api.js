/**
 * SpeedNet API Client
 * Thin wrapper around fetch that:
 *  - Prefixes all requests with VITE_API_URL
 *  - Injects the JWT from localStorage on every request
 *  - Throws on non-2xx responses with the server's error message
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Token helpers ─────────────────────────────────────────────
export function getToken()          { return localStorage.getItem('sn_token'); }
export function setToken(token)     { localStorage.setItem('sn_token', token); }
export function removeToken()       { localStorage.removeItem('sn_token'); }
export function isAuthenticated()   { return Boolean(getToken()); }

// ── Core request ──────────────────────────────────────────────
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Handle 401 globally — clear token and redirect to login (except on login route itself)
  if (res.status === 401 && path !== '/api/auth/login') {
    removeToken();
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return data;
}

// ── Convenience methods ───────────────────────────────────────
export const api = {
  get:    (path)              => request('GET',    path),
  post:   (path, body)        => request('POST',   path, body),
  patch:  (path, body)        => request('PATCH',  path, body),
  delete: (path)              => request('DELETE', path),

  // ── Auth ────────────────────────────────────────────────────
  login: (email, password) =>
    request('POST', '/api/auth/login', { email, password }),

  me: () => request('GET', '/api/auth/me'),

  // ── Products ────────────────────────────────────────────────
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/products${qs ? `?${qs}` : ''}`);
  },
  createProduct:  (body)       => request('POST',   '/api/products',      body),
  updateProduct:  (id, body)   => request('PATCH',  `/api/products/${id}`, body),
  deleteProduct:  (id)         => request('DELETE', `/api/products/${id}`),

  // ── Invoices ────────────────────────────────────────────────
  getInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/invoices${qs ? `?${qs}` : ''}`);
  },
  createInvoice:      (body)   => request('POST', '/api/invoices',       body),
  createInvoiceItems: (items)  => request('POST', '/api/invoices/items', items),

  // ── Loans ───────────────────────────────────────────────────
  getLoans:    ()              => request('GET',    '/api/loans'),
  getLoan:     (id)            => request('GET',    `/api/loans/${id}`),
  createLoan:  (body)          => request('POST',   '/api/loans',        body),
  updateLoan:  (id, body)      => request('PATCH',  `/api/loans/${id}`,  body),
  deleteLoan:  (id)            => request('DELETE', `/api/loans/${id}`),

  // ── Loan Payments ───────────────────────────────────────────
  createLoanPayment: (body)    => request('POST', '/api/loan-payments', body),

  // ── Print Logs ──────────────────────────────────────────────
  getPrintLogs:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/print-logs${qs ? `?${qs}` : ''}`);
  },
  createPrintLog:      (body)  => request('POST',  '/api/print-logs',      body),
  resolvePrintLog:     (id, body) => request('PATCH', `/api/print-logs/${id}`, body),

  // ── Printer Configs ─────────────────────────────────────────
  getPrinterConfigs:   ()      => request('GET',    '/api/printer-configs'),
  upsertPrinterConfig: (body)  => request('POST',   '/api/printer-configs', body),
  deletePrinterConfig: (id)    => request('DELETE', `/api/printer-configs/${id}`),

  // ── Expenses ─────────────────────────────────────────────────
  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/expenses${qs ? `?${qs}` : ''}`);
  },
  getExpenseCategories: () => request('GET', '/api/expenses/categories'),
  createExpense:  (body)       => request('POST',   '/api/expenses',       body),
  updateExpense:  (id, body)   => request('PATCH',  `/api/expenses/${id}`, body),
  deleteExpense:  (id)         => request('DELETE', `/api/expenses/${id}`),

  // ── Quick Bill ───────────────────────────────────────────────
  getQuickBills: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/quick-bill${qs ? `?${qs}` : ''}`);
  },
  getQuickBillSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/quick-bill/summary${qs ? `?${qs}` : ''}`);
  },
  createQuickBill:  (body)  => request('POST',   '/api/quick-bill',       body),
  updateQuickBill:  (id, body) => request('PATCH', `/api/quick-bill/${id}`, body),
  deleteQuickBill:  (id)    => request('DELETE', `/api/quick-bill/${id}`),

  // ── Agent (Spooler) ──────────────────────────────────────────
  getAgentStatus:   ()     => request('GET',  '/api/agent/status'),
  sendHeartbeat:    ()     => request('POST', '/api/agent/heartbeat'),
  downloadStartBat: ()     => `${BASE_URL}/api/agent/download/start`,
  downloadInstallBat: ()   => `${BASE_URL}/api/agent/download/install`,

  // ── Vault (Password Manager) ─────────────────────────────────
  getVault:    (device_id)     => request('GET',  `/api/vault?device_id=${encodeURIComponent(device_id)}`),
  upsertVault: (body)          => request('POST', '/api/vault', body),
  deleteVault: (device_id)     => request('DELETE', `/api/vault?device_id=${encodeURIComponent(device_id)}`),

  // ── CV Saves ─────────────────────────────────────────────────
  getCvSaves:    ()            => request('GET',    '/api/cv-saves'),
  upsertCvSave:  (body)        => request('POST',   '/api/cv-saves', body),
  deleteCvSave:  (id)          => request('DELETE', `/api/cv-saves/${id}`),

  // ── Customers ────────────────────────────────────────────────
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/customers${qs ? `?${qs}` : ''}`);
  },
  getCustomer:        (id)         => request('GET',    `/api/customers/${id}`),
  createCustomer:     (body)       => request('POST',   '/api/customers', body),
  updateCustomer:     (id, body)   => request('PATCH',  `/api/customers/${id}`, body),
  deleteCustomer:     (id)         => request('DELETE', `/api/customers/${id}`),
  getCustomerInvoices:(id)         => request('GET',    `/api/customers/${id}/invoices`),

  // Customer Documents
  addCustomerDocument:    (id, body)        => request('POST',   `/api/customers/${id}/documents`, body),
  updateCustomerDocument: (id, docId, body) => request('PATCH',  `/api/customers/${id}/documents/${docId}`, body),
  deleteCustomerDocument: (id, docId)       => request('DELETE', `/api/customers/${id}/documents/${docId}`),

  // ── Works ────────────────────────────────────────────────────
  getWorks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/works${qs ? `?${qs}` : ''}`);
  },
  getWorkStats: () => request('GET', '/api/works/stats'),
  getWork:       (id)         => request('GET',    `/api/works/${id}`),
  createWork:    (body)       => request('POST',   '/api/works', body),
  updateWork:    (id, body)   => request('PATCH',  `/api/works/${id}`, body),
  deleteWork:    (id)         => request('DELETE', `/api/works/${id}`),

  // Work Notes
  addWorkNote:    (id, body)        => request('POST',   `/api/works/${id}/notes`, body),
  deleteWorkNote: (id, noteId)      => request('DELETE', `/api/works/${id}/notes/${noteId}`),

  // Work Documents
  addWorkDocument:         (id, body)        => request('POST',   `/api/works/${id}/documents`, body),
  addWorkDocumentFromCustomer: (id, body)    => request('POST',   `/api/works/${id}/documents/from-customer`, body),
  deleteWorkDocument:      (id, docId)       => request('DELETE', `/api/works/${id}/documents/${docId}`),

  // Work Issues
  addWorkIssue:    (id, body)        => request('POST',   `/api/works/${id}/issues`, body),
  updateWorkIssue: (id, issueId, body) => request('PATCH', `/api/works/${id}/issues/${issueId}`, body),
  deleteWorkIssue: (id, issueId)     => request('DELETE', `/api/works/${id}/issues/${issueId}`),

  // Work Time Logs
  startTimeLog:    (id, body)        => request('POST',   `/api/works/${id}/time-logs`, body),
  stopTimeLog:     (id, logId, body) => request('PATCH',  `/api/works/${id}/time-logs/${logId}`, body),
  deleteTimeLog:   (id, logId)       => request('DELETE', `/api/works/${id}/time-logs/${logId}`),

  // Notifications
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/notifications${qs ? `?${qs}` : ''}`);
  },
  markNotificationRead:   (id)   => request('PATCH',  `/api/notifications/${id}/read`),
  markAllNotificationsRead: ()    => request('PATCH',  '/api/notifications/read-all'),
  deleteNotification:     (id)   => request('DELETE', `/api/notifications/${id}`),
  clearNotifications:     ()     => request('DELETE', '/api/notifications'),

  // Customer Passwords / Credentials
  addCustomerPassword:    (id, body)        => request('POST',   `/api/customers/${id}/passwords`, body),
  updateCustomerPassword: (id, pwdId, body) => request('PATCH',  `/api/customers/${id}/passwords/${pwdId}`, body),
  deleteCustomerPassword: (id, pwdId)       => request('DELETE', `/api/customers/${id}/passwords/${pwdId}`),
};
