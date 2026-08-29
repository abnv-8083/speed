require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Force Google DNS to resolve Atlas SRV records (bypasses ISP DNS issues)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const authRoutes          = require('./routes/auth');
const productRoutes       = require('./routes/products');
const invoiceRoutes       = require('./routes/invoices');
const loanRoutes          = require('./routes/loans');
const loanPaymentRoutes   = require('./routes/loanPayments');
const printLogRoutes      = require('./routes/printLogs');
const printerConfigRoutes = require('./routes/printerConfigs');
const vaultRoutes         = require('./routes/vault');
const customerRoutes      = require('./routes/customers');
const cvSaveRoutes        = require('./routes/cvSaves');
const agentRoutes         = require('./routes/agent');
const quickBillRoutes     = require('./routes/quickBill');
const expenseRoutes       = require('./routes/expenses');
const workRoutes          = require('./routes/works');
const notificationRoutes  = require('./routes/notifications');
const websiteRoutes       = require('./routes/website');

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/customers',       customerRoutes);
app.use('/api/products',        productRoutes);
app.use('/api/invoices',        invoiceRoutes);
app.use('/api/loans',           loanRoutes);
app.use('/api/loan-payments',   loanPaymentRoutes);
app.use('/api/print-logs',      printLogRoutes);
app.use('/api/printer-configs', printerConfigRoutes);
app.use('/api/vault',           vaultRoutes);
app.use('/api/cv-saves',        cvSaveRoutes);
app.use('/api/agent',           agentRoutes);
app.use('/api/quick-bill',      quickBillRoutes);
app.use('/api/expenses',        expenseRoutes);
app.use('/api/works',           workRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/website',         websiteRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Connect to MongoDB and start ──────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀  API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
