const express     = require('express');
const PrintLog    = require('../models/PrintLog');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/print-logs — all logs, newest first
// Optional: ?needs_review=true to get only flagged logs
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.needs_review === 'true') filter.needs_review = true;
    const logs = await PrintLog.find(filter).sort({ createdAt: -1 });
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

// PATCH /api/print-logs/:id — resolve a needs_review job
// Staff corrects paper_size and color_mode, clears the flag
router.patch('/:id', async (req, res) => {
  try {
    const log = await PrintLog.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, needs_review: false, review_note: '' } },
      { new: true, runValidators: true }
    );
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
