const express     = require('express');
const Product     = require('../models/Product');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

const router = express.Router();
router.use(requireAuth);

// GET /api/products  — list all non-deleted products
router.get('/', async (req, res) => {
  try {
    const filter = { name: { $not: /^\[DELETED\]/i } };

    // Optional: filter print products only
    if (req.query.is_print === 'true')  filter.is_print   = true;
    if (req.query.is_blocked === 'false') filter.is_blocked = false;

    const products = await Product.find(filter).sort({ createdAt: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products  — create product
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    broadcast('products', 'created', product);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/products/:id  — update product fields
router.patch('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    broadcast('products', 'updated', product);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    broadcast('products', 'deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    // Signal foreign-key-style constraint to the frontend
    res.status(409).json({ error: 'foreign key constraint', message: err.message });
  }
});

module.exports = router;
