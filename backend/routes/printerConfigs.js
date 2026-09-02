const express       = require('express');
const PrinterConfig = require('../models/PrinterConfig');
const requireAuth   = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

// GET /api/printer-configs — all printer mappings
router.get('/', async (req, res) => {
  try {
    const configs = await PrinterConfig.find().sort({ printer_name: 1 });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/printer-configs — create or upsert by printer_name
router.post('/', async (req, res) => {
  try {
    const { printer_name, paper_size, color_mode, notes } = req.body;
    const config = await PrinterConfig.findOneAndUpdate(
      { printer_name },
      { $set: { printer_name, paper_size, color_mode, notes: notes || '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    broadcast('printer-configs', 'updated', config);
    res.status(201).json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/printer-configs/:id
router.delete('/:id', async (req, res) => {
  try {
    await PrinterConfig.findByIdAndDelete(req.params.id);
    broadcast('printer-configs', 'deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
