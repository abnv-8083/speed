const express          = require('express');
const QuickBillSession = require('../models/QuickBillSession');
const Invoice          = require('../models/Invoice');
const InvoiceItem      = require('../models/InvoiceItem');
const Product          = require('../models/Product');
const requireAuth      = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * GET /api/quick-bill
 * Query params:
 *   date        — exact date "YYYY-MM-DD"
 *   start_date  — range start "YYYY-MM-DD"
 *   end_date    — range end   "YYYY-MM-DD"
 * Default: today only (for the live panel)
 */
router.get('/', async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    let filter = {};

    if (date) {
      filter.billed_date = date;
    } else if (start_date || end_date) {
      filter.billed_date = {};
      if (start_date) filter.billed_date.$gte = start_date;
      if (end_date)   filter.billed_date.$lte = end_date;
    } else {
      filter.billed_date = todayStr();
    }

    const bills = await QuickBillSession.find(filter).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/quick-bill
 * Body: { items: [{ product_id, product_name, price, quantity, line_total }], total, note }
 * Also creates a mirrored Invoice + InvoiceItems so Sales Report picks it up.
 */
router.post('/', async (req, res) => {
  try {
    const { items, total, note } = req.body;
    const today = todayStr();

    // Auto-number bills per day
    const todayCount = await QuickBillSession.countDocuments({ billed_date: today });

    // 1. Create the QuickBillSession
    const bill = await QuickBillSession.create({
      bill_number: todayCount + 1,
      items,
      total,
      note:        note || '',
      billed_date: today,
    });

    // 2. Mirror into Invoice collection so Sales Report includes it
    try {
      const invoice = await Invoice.create({
        customer_name: note ? note : 'Quick Bill',
        total_amount:  total,
        discount:      items.reduce((s, i) => s + (Number(i.discount) || 0), 0),
      });

      // 3. Create InvoiceItems — resolve product_id from name if needed
      const invoiceItems = items.map(item => ({
        invoice_id:    invoice._id,
        product_id:    item.product_id,
        quantity:      item.quantity,
        price_at_time: item.price,
      }));

      await InvoiceItem.insertMany(invoiceItems);

      // Store the linked invoice id on the QuickBillSession for cleanup later
      await QuickBillSession.findByIdAndUpdate(bill._id, { linked_invoice_id: invoice._id });
      bill.linked_invoice_id = invoice._id;
    } catch (mirrorErr) {
      // Non-fatal — quick bill is saved, just sales report won't reflect it
      console.warn('⚠️  Failed to mirror quick bill to invoices:', mirrorErr.message);
    }

    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/quick-bill/:id
 * Update a bill's items, total, or note.
 * Also keeps the mirrored Invoice in sync.
 */
router.patch('/:id', async (req, res) => {
  try {
    const bill = await QuickBillSession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // Sync the mirrored invoice total if it exists
    if (bill.linked_invoice_id && req.body.total !== undefined) {
      await Invoice.findByIdAndUpdate(bill.linked_invoice_id, { total_amount: req.body.total });
    }

    // Sync invoice items if items were updated
    if (bill.linked_invoice_id && req.body.items) {
      await InvoiceItem.deleteMany({ invoice_id: bill.linked_invoice_id });
      const newItems = req.body.items.map(item => ({
        invoice_id:    bill.linked_invoice_id,
        product_id:    item.product_id,
        quantity:      item.quantity,
        price_at_time: item.price,
      }));
      await InvoiceItem.insertMany(newItems);
    }

    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/quick-bill/:id
 * Also removes the mirrored Invoice + InvoiceItems from Sales Report.
 */
router.delete('/:id', async (req, res) => {
  try {
    const bill = await QuickBillSession.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // Remove the mirrored invoice if one was created
    if (bill.linked_invoice_id) {
      await InvoiceItem.deleteMany({ invoice_id: bill.linked_invoice_id });
      await Invoice.findByIdAndDelete(bill.linked_invoice_id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/quick-bill/summary
 * Returns aggregated stats for a date or range
 * Query params: date | start_date + end_date (default: today)
 */
router.get('/summary', async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    let matchDate = {};

    if (date) {
      matchDate = { billed_date: date };
    } else if (start_date || end_date) {
      matchDate = { billed_date: {} };
      if (start_date) matchDate.billed_date.$gte = start_date;
      if (end_date)   matchDate.billed_date.$lte = end_date;
    } else {
      matchDate = { billed_date: todayStr() };
    }

    const [result] = await QuickBillSession.aggregate([
      { $match: matchDate },
      {
        $group: {
          _id:         null,
          totalAmount: { $sum: '$total' },
          billCount:   { $sum: 1 },
          itemCount:   { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]);

    res.json(result || { totalAmount: 0, billCount: 0, itemCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
