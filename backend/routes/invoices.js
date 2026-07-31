const express     = require('express');
const Invoice     = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/invoices
 * Returns all invoices with their items populated (product name included).
 * Supports optional date range: ?start=ISO&end=ISO
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.start || req.query.end) {
      filter.createdAt = {};
      if (req.query.start) filter.createdAt.$gte = new Date(req.query.start);
      if (req.query.end)   filter.createdAt.$lte = new Date(req.query.end);
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    // Attach items + populated product name to each invoice
    const invoiceIds = invoices.map(i => i._id);
    const allItems = await InvoiceItem.find({ invoice_id: { $in: invoiceIds } })
      .populate('product_id', 'name')
      .lean();

    // Group items by invoice_id
    const itemsByInvoice = {};
    allItems.forEach(item => {
      const key = item.invoice_id.toString();
      if (!itemsByInvoice[key]) itemsByInvoice[key] = [];
      itemsByInvoice[key].push({
        ...item,
        id: item._id,
        created_at: item.createdAt,
        // Replicate Supabase join shape: products: { name }
        products: item.product_id ? { name: item.product_id.name } : null,
      });
    });

    const result = invoices.map(inv => ({
      ...inv,
      id:           inv._id,
      created_at:   inv.createdAt,
      invoice_items: itemsByInvoice[inv._id.toString()] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/invoices
 * Body: { customer_name, total_amount, discount }
 * Returns the created invoice.
 */
router.post('/', async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/invoices/items
 * Body: [{ invoice_id, product_id, quantity, price_at_time }, ...]
 */
router.post('/items', async (req, res) => {
  try {
    const items = await InvoiceItem.insertMany(req.body);
    res.status(201).json(items);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
