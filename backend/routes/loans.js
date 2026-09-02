const express     = require('express');
const Loan        = require('../models/Loan');
const LoanPayment = require('../models/LoanPayment');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

// GET /api/loans  — all loans, newest first
router.get('/', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/loans/:id  — single loan with payments
router.get('/:id', async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).lean();
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const payments = await LoanPayment.find({ loan_id: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ...loan,
      id:            loan._id,
      created_at:    loan.createdAt,
      loan_payments: payments.map(p => ({
        ...p,
        id:         p._id,
        created_at: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loans
router.post('/', async (req, res) => {
  try {
    const loan = await Loan.create(req.body);
    broadcast('loans', 'created', loan);
    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/loans/:id
router.patch('/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    broadcast('loans', 'updated', loan);
    res.json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/loans/:id  — also deletes associated payments
router.delete('/:id', async (req, res) => {
  try {
    await LoanPayment.deleteMany({ loan_id: req.params.id });
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    broadcast('loans', 'deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
