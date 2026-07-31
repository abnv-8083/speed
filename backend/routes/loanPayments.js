const express     = require('express');
const LoanPayment = require('../models/LoanPayment');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/loan-payments
router.post('/', async (req, res) => {
  try {
    const payment = await LoanPayment.create(req.body);
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
