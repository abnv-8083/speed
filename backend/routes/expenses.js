const express     = require('express');
const Expense     = require('../models/Expense');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/expenses
 * Query params:
 *   start_date — "YYYY-MM-DD"
 *   end_date   — "YYYY-MM-DD"
 * Default: no filter (returns all)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.start_date || req.query.end_date) {
      filter.expense_date = {};
      if (req.query.start_date) filter.expense_date.$gte = req.query.start_date;
      if (req.query.end_date)   filter.expense_date.$lte = req.query.end_date;
    }
    const expenses = await Expense.find(filter).sort({ expense_date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/expenses/categories — return allowed category list
 */
router.get('/categories', (_req, res) => {
  res.json(Expense.CATEGORIES);
});

/**
 * POST /api/expenses
 * Body: { title, amount, category, expense_date, note }
 */
router.post('/', async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    broadcast('expenses', 'created', expense);
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/expenses/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    broadcast('expenses', 'updated', expense);
    res.json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    broadcast('expenses', 'deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
