const express     = require('express');
const PrintLog    = require('../models/PrintLog');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/print-logs  — all logs, newest first
router.get('/', async (req, res) => {
  try {
    const logs = await PrintLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/print-logs
router.post('/', async (req, res) => {
  try {
    const log = await PrintLog.create(req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
