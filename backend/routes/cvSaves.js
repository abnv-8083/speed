const express     = require('express');
const CvSave      = require('../models/CvSave');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/cv-saves
router.get('/', async (req, res) => {
  try {
    const saves = await CvSave.find().sort({ saved_at: -1 });
    res.json(saves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv-saves  — upsert by id
router.post('/', async (req, res) => {
  try {
    const { id, name, template, data } = req.body;
    let save;
    if (id) {
      save = await CvSave.findByIdAndUpdate(
        id,
        { $set: { name, template, data, saved_at: new Date() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      save = await CvSave.create({ name, template, data });
    }
    res.status(201).json(save);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/cv-saves/:id
router.delete('/:id', async (req, res) => {
  try {
    await CvSave.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
