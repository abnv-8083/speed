const express          = require('express');
const QuickBillSession = require('../models/QuickBillSession');
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
 */
router.post('/', async (req, res) => {
  try {
    const { items, total, note } = req.body;
    const today = todayStr();

    // Auto-number bills per day (count existing today + 1)
    const todayCount = await QuickBillSession.countDocuments({ billed_date: today });

    const bill = await QuickBillSession.create({
      bill_number: todayCount + 1,
      items,
      total,
      note:        note || '',
      billed_date: today,
    });

    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/quick-bill/:id
 * Update a bill's items, total, or note
 */
router.patch('/:id', async (req, res) => {
  try {
    const bill = await QuickBillSession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/quick-bill/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const bill = await QuickBillSession.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
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
