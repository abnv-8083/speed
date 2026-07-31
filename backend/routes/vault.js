const express     = require('express');
const VaultStore  = require('../models/VaultStore');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/vault?device_id=xxx
router.get('/', async (req, res) => {
  try {
    const { device_id } = req.query;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    const row = await VaultStore.findOne({ device_id });
    res.json(row || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vault  — upsert by device_id
router.post('/', async (req, res) => {
  try {
    const { device_id, ...fields } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    const row = await VaultStore.findOneAndUpdate(
      { device_id },
      { $set: { device_id, ...fields } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vault?device_id=xxx
router.delete('/', async (req, res) => {
  try {
    const { device_id } = req.query;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });
    await VaultStore.deleteOne({ device_id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
