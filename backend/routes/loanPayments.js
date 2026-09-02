const express     = require('express');
const LoanPayment = require('../models/LoanPayment');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

// POST /api/loan-payments
router.post('/', async (req, res) => {
  try {
    const payment = await LoanPayment.create(req.body);
    broadcast('loan-payments', 'created', payment);
    broadcast('loans', 'payment_added', { loan_id: payment.loan_id, payment });
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
