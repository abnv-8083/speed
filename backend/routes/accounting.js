const express       = require('express');
const DailyAccount  = require('../models/DailyAccount');
const Invoice       = require('../models/Invoice');
const InvoiceItem   = require('../models/InvoiceItem');
const Expense       = require('../models/Expense');
const QuickBill     = require('../models/QuickBillSession');
const requireAuth   = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

// ── Helpers ────────────────────────────────────────────────────
function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Calculate cash & bank movements from sales/expenses for a given date.
 *
 * Payment method → account mapping:
 *   Cash          → Cash Box
 *   UPI           → Bank Account
 *   UPI - Bank    → Bank Account
 *   Cash - Bank   → Cash Box (cash received) + Bank (service portion)
 *
 * Expenses:
 *   Cash          → Cash Box
 *   UPI           → Bank Account
 */
async function calcDayActivity(dateStr) {
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end   = new Date(dateStr + 'T23:59:59.999Z');

  // ── Invoices ──
  const invoices = await Invoice.find({
    createdAt: { $gte: start, $lte: end },
  }).lean();

  const invoiceIds = invoices.map(i => i._id);
  const allItems = invoiceIds.length > 0
    ? await InvoiceItem.find({ invoice_id: { $in: invoiceIds } }).lean()
    : [];

  const itemsByInvoice = {};
  allItems.forEach(item => {
    const key = item.invoice_id.toString();
    if (!itemsByInvoice[key]) itemsByInvoice[key] = [];
    itemsByInvoice[key].push(item);
  });

  let cashIn = 0, bankIn = 0;
  const salesCash = []; // { name, amount, time }
  const salesBank = [];

  invoices.forEach(inv => {
    const pm = inv.payment_method || 'Cash';
    const items = itemsByInvoice[inv._id.toString()] || [];
    let invTotal = 0;
    items.forEach(item => {
      invTotal += Number(item.price_at_time || 0) * Number(item.quantity || 1);
    });
    // Use total_amount if items didn't compute, fallback to inv total
    if (invTotal === 0) invTotal = Number(inv.total_amount || 0);

    const entry = {
      id: inv._id,
      name: items.map(i => i.product_name || 'Item').join(', ') || 'Sale',
      amount: invTotal,
      discount: Number(inv.discount || 0),
      time: inv.createdAt,
      customer: inv.customer_name || 'Walk-in',
    };

    if (pm === 'Cash') {
      cashIn += invTotal;
      salesCash.push(entry);
    } else if (pm === 'UPI' || pm === 'UPI - Bank') {
      bankIn += invTotal;
      salesBank.push(entry);
    } else if (pm === 'Cash - Bank') {
      // Customer paid via bank, but cash is in hand
      cashIn += invTotal;
      salesCash.push(entry);
    } else {
      cashIn += invTotal;
      salesCash.push(entry);
    }
  });

  // ── Quick Bills ──
  const quickBills = await QuickBill.find({
    createdAt: { $gte: start, $lte: end },
  }).lean();

  quickBills.forEach(qb => {
    const pm = qb.payment_method || 'Cash';
    const amt = Number(qb.total || 0);
    const entry = {
      id: qb._id,
      name: (qb.items || []).map(i => i.product_name).join(', ') || 'Quick Bill',
      amount: amt,
      discount: 0,
      time: qb.createdAt,
      customer: 'Quick Bill',
    };

    if (pm === 'Cash') {
      cashIn += amt;
      salesCash.push(entry);
    } else if (pm === 'UPI' || pm === 'UPI - Bank') {
      bankIn += amt;
      salesBank.push(entry);
    } else if (pm === 'Cash - Bank') {
      cashIn += amt;
      salesCash.push(entry);
    } else {
      cashIn += amt;
      salesCash.push(entry);
    }
  });

  // ── Expenses ──
  const expenses = await Expense.find({
    expense_date: dateStr,
  }).lean();

  let cashOut = 0, bankOut = 0;
  const expenseList = [];

  expenses.forEach(exp => {
    const pm = exp.payment_method || 'Cash';
    const amt = Number(exp.amount || 0);
    const entry = {
      id: exp._id,
      name: exp.title,
      category: exp.category,
      amount: amt,
      time: exp.createdAt,
    };

    if (pm === 'Cash') {
      cashOut += amt;
      expenseList.push({ ...entry, account: 'cash' });
    } else {
      bankOut += amt;
      expenseList.push({ ...entry, account: 'bank' });
    }
  });

  return { cashIn, bankIn, cashOut, bankOut, salesCash, salesBank, expenseList };
}

// ── GET /api/accounting/today ──────────────────────────────────
// Returns today's account + calculated balances
router.get('/today', async (req, res) => {
  try {
    const dateStr = req.query.date || todayStr();
    let account = await DailyAccount.findOne({ date: dateStr });
    if (!account) {
      account = await DailyAccount.create({ date: dateStr, cash_opening: 0, bank_opening: 0 });
    }

    const activity = await calcDayActivity(dateStr);

    // Calculate transfers
    let cashToBank = 0, bankToCash = 0;
    (account.transfers || []).forEach(t => {
      if (t.direction === 'cash_to_bank') cashToBank += Number(t.amount);
      if (t.direction === 'bank_to_cash') bankToCash += Number(t.amount);
    });

    const cashBalance = account.cash_opening + activity.cashIn - activity.cashOut - cashToBank + bankToCash;
    const bankBalance = account.bank_opening + activity.bankIn - activity.bankOut + cashToBank - bankToCash;
    const totalBalance = cashBalance + bankBalance;

    res.json({
      date: dateStr,
      account: account.toJSON(),
      opening: { cash: account.cash_opening, bank: account.bank_opening },
      activity,
      transfers: account.transfers || [],
      balance: {
        cash: cashBalance,
        bank: bankBalance,
        total: totalBalance,
      },
      summary: {
        cashIn: activity.cashIn,
        cashOut: activity.cashOut,
        bankIn: activity.bankIn,
        bankOut: activity.bankOut,
        cashToBank,
        bankToCash,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/accounting/opening ────────────────────────────────
// Set or update opening balances for a date
router.put('/opening', async (req, res) => {
  try {
    const { date, cash_opening, bank_opening, note } = req.body;
    const dateStr = date || todayStr();

    const account = await DailyAccount.findOneAndUpdate(
      { date: dateStr },
      {
        $set: {
          cash_opening: Number(cash_opening) || 0,
          bank_opening: Number(bank_opening) || 0,
          note: note || '',
        },
      },
      { new: true, upsert: true }
    );

    broadcast('accounting', 'updated', { date: dateStr });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/accounting/transfer ──────────────────────────────
// Add a transfer between Cash Box and Bank Account
router.post('/transfer', async (req, res) => {
  try {
    const { date, direction, amount, note } = req.body;
    const dateStr = date || todayStr();

    if (!['cash_to_bank', 'bank_to_cash'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    let account = await DailyAccount.findOne({ date: dateStr });
    if (!account) {
      account = await DailyAccount.create({ date: dateStr, cash_opening: 0, bank_opening: 0 });
    }

    account.transfers.push({
      direction,
      amount: Number(amount),
      note: note || '',
      timestamp: new Date(),
    });

    await account.save();
    broadcast('accounting', 'transfer_added', { date: dateStr });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/accounting/transfer/:transferId ─────────────────
// Remove a transfer
router.delete('/transfer/:transferId', async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr = date || todayStr();

    const account = await DailyAccount.findOne({ date: dateStr });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    account.transfers = account.transfers.filter(
      t => t._id.toString() !== req.params.transferId
    );
    await account.save();

    broadcast('accounting', 'transfer_removed', { date: dateStr });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/accounting/history ────────────────────────────────
// Returns account summaries for multiple days
router.get('/history', async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = start;
      if (end)   filter.date.$lte = end;
    }

    const accounts = await DailyAccount.find(filter).sort({ date: -1 }).lean();

    // Enrich each day with activity
    const result = [];
    for (const acct of accounts) {
      const activity = await calcDayActivity(acct.date);
      let cashToBank = 0, bankToCash = 0;
      (acct.transfers || []).forEach(t => {
        if (t.direction === 'cash_to_bank') cashToBank += Number(t.amount);
        if (t.direction === 'bank_to_cash') bankToCash += Number(t.amount);
      });

      const cashBalance = (acct.cash_opening || 0) + activity.cashIn - activity.cashOut - cashToBank + bankToCash;
      const bankBalance = (acct.bank_opening || 0) + activity.bankIn - activity.bankOut + cashToBank - bankToCash;

      result.push({
        date: acct.date,
        opening: { cash: acct.cash_opening || 0, bank: acct.bank_opening || 0 },
        balance: { cash: cashBalance, bank: bankBalance, total: cashBalance + bankBalance },
        summary: {
          cashIn: activity.cashIn,
          cashOut: activity.cashOut,
          bankIn: activity.bankIn,
          bankOut: activity.bankOut,
          cashToBank,
          bankToCash,
        },
        transfers: acct.transfers || [],
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
