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

  // Handle 401 globally — clear token and redirect to login
  if (res.status === 401) {
    removeToken();
    window.location.href = '/';
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
};
