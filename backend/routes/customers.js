const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const QuickBillSession = require('../models/QuickBillSession');
const requireAuth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { broadcast } = require('../websocket');

router.use(requireAuth);

// Configure Cloudinary if env keys exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── GET /api/customers — List all customers with search & pagination ────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { address: regex },
        ],
      };
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers/:id — Single customer detail ──────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/customers — Create new customer ────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, address, dob } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is mandatory' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Customer phone number is mandatory' });
    }

    const customer = await Customer.create({
      name:    name.trim(),
      phone:   phone.trim(),
      email:   (email || '').trim(),
      address: (address || '').trim(),
      dob:     (dob || '').trim(),
    });

    broadcast('customers', 'created', customer);
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/customers/:id — Update customer details ───────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, phone, email, address, dob } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Customer name cannot be empty' });
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      if (!phone.trim()) return res.status(400).json({ error: 'Customer phone cannot be empty' });
      updateData.phone = phone.trim();
    }
    if (email !== undefined) updateData.email = email.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (dob !== undefined) updateData.dob = dob.trim();

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    broadcast('customers', 'updated', customer);
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id — Delete customer ──────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    broadcast('customers', 'deleted', { id: req.params.id });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers/:id/invoices — Invoices billed for this customer ──────
router.get('/:id/invoices', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Match invoices by customer name (case-insensitive regex)
    const nameRegex = new RegExp(`^${customer.name.trim()}$`, 'i');
    const invoices = await Invoice.find({
      customer_name: nameRegex,
    }).sort({ createdAt: -1 });

    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── CUSTOMER DOCUMENTS SUB-ROUTES ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/customers/:id/documents — Upload document ──────────────────────
router.post('/:id/documents', async (req, res, next) => {
  try {
    const { name, file_type, file_size, data } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Document name is required' });
    if (!data) return res.status(400).json({ error: 'Document file data is required' });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let file_url = '';
    let public_id = '';

    // If Cloudinary configured, upload to Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const uploadRes = await cloudinary.uploader.upload(data, {
          folder: `speednet/customers/${customer._id}/documents`,
          resource_type: 'auto',
          public_id: `${Date.now()}_${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        });
        file_url = uploadRes.secure_url;
        public_id = uploadRes.public_id;
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        // Fallback to storing data URI if Cloudinary fails
        file_url = data;
      }
    } else {
      // Store data URI directly in database
      file_url = data;
    }

    const docObj = {
      name: name.trim(),
      file_type: file_type || 'application/pdf',
      file_size: file_size || 0,
      file_url,
      public_id,
      data: file_url === data ? data : '',
    };

    customer.documents.unshift(docObj);
    await customer.save();

    res.status(201).json(customer.documents[0]);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/customers/:id/documents/:docId — Edit document name ───────────
router.patch('/:id/documents/:docId', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Document name is required' });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const doc = customer.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.name = name.trim();
    await customer.save();

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id/documents/:docId — Delete document ─────────────
router.delete('/:id/documents/:docId', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const doc = customer.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(doc.public_id, { resource_type: 'raw' });
        await cloudinary.uploader.destroy(doc.public_id);
      } catch (cloudErr) {
        console.warn('Cloudinary delete warning:', cloudErr.message);
      }
    }

    doc.deleteOne();
    await customer.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── CUSTOMER PASSWORD MANAGER / CREDENTIALS SUB-ROUTES ──────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/customers/:id/passwords — Add credentials ──────────────────────
router.post('/:id/passwords', async (req, res, next) => {
  try {
    const { title, username, password, url, notes } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Credential title/service is required' });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const credObj = {
      title:    title.trim(),
      username: (username || '').trim(),
      password: password || '',
      url:      (url || '').trim(),
      notes:    (notes || '').trim(),
    };

    customer.passwords.unshift(credObj);
    await customer.save();

    res.status(201).json(customer.passwords[0]);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/customers/:id/passwords/:pwdId — Update credentials ──────────
router.patch('/:id/passwords/:pwdId', async (req, res, next) => {
  try {
    const { title, username, password, url, notes } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const cred = customer.passwords.id(req.params.pwdId);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });

    if (title !== undefined) cred.title = title.trim();
    if (username !== undefined) cred.username = username.trim();
    if (password !== undefined) cred.password = password;
    if (url !== undefined) cred.url = url.trim();
    if (notes !== undefined) cred.notes = notes.trim();

    await customer.save();
    res.json(cred);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id/passwords/:pwdId — Delete credentials ──────────
router.delete('/:id/passwords/:pwdId', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const cred = customer.passwords.id(req.params.pwdId);
    if (!cred) return res.status(404).json({ error: 'Credential not found' });

    cred.deleteOne();
    await customer.save();

    res.json({ message: 'Credential deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
