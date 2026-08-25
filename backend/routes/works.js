const express = require('express');
const router = express.Router();
const Work = require('../models/Work');
const Customer = require('../models/Customer');
const requireAuth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

router.use(requireAuth);

// Configure Cloudinary if env keys exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── GET /api/works — List all works with search, filter, pagination ─────────
router.get('/', async (req, res, next) => {
  try {
    const { search, status, priority, customer_id, sort } = req.query;
    let query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { work_id: regex },
        { title: regex },
        { customer_name: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (customer_id) query.customer_id = customer_id;

    let sortOption = { createdAt: -1 };
    if (sort === 'due_date') sortOption = { due_date: 1 };
    if (sort === 'priority') sortOption = { priority: -1, createdAt: -1 };
    if (sort === 'status') sortOption = { status: 1, createdAt: -1 };

    const works = await Work.find(query).sort(sortOption).populate('customer_id', 'name phone email');
    res.json(works);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/works/stats — Dashboard stats ─────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Work.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Work.countDocuments();
    const openIssues = await Work.aggregate([
      { $unwind: '$issues' },
      { $match: { 'issues.status': 'open' } },
      { $count: 'total' },
    ]);

    res.json({
      total,
      by_status: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      open_issues: openIssues[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/works/:id — Single work detail ────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id).populate('customer_id', 'name phone email address documents');
    if (!work) return res.status(404).json({ error: 'Work not found' });
    res.json(work);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/works — Create new work ──────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { title, description, customer_id, customer_name, status, priority, start_date, due_date, tags, estimated_hours } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Work title is required' });
    }

    const workData = {
      title: title.trim(),
      description: (description || '').trim(),
      status: status || 'new',
      priority: priority || 'medium',
      start_date: start_date || '',
      due_date: due_date || '',
      tags: tags || [],
      estimated_hours: estimated_hours || 0,
    };

    // Link customer if provided
    if (customer_id) {
      const customer = await Customer.findById(customer_id);
      if (customer) {
        workData.customer_id = customer._id;
        workData.customer_name = customer.name;
      }
    } else if (customer_name && customer_name.trim()) {
      workData.customer_name = customer_name.trim();
    }

    const work = await Work.create(workData);
    res.status(201).json(work);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/works/:id — Update work details ─────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { title, description, customer_id, customer_name, status, priority, start_date, due_date, completed_at, tags, estimated_hours, actual_hours } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed' && !completed_at) {
        updateData.completed_at = new Date().toISOString().slice(0, 10);
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    if (tags !== undefined) updateData.tags = tags;
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;

    // Update customer link
    if (customer_id !== undefined) {
      if (customer_id) {
        const customer = await Customer.findById(customer_id);
        if (customer) {
          updateData.customer_id = customer._id;
          updateData.customer_name = customer.name;
        }
      } else {
        updateData.customer_id = null;
        if (customer_name !== undefined) updateData.customer_name = customer_name.trim();
      }
    } else if (customer_name !== undefined) {
      updateData.customer_name = customer_name.trim();
    }

    const work = await Work.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!work) return res.status(404).json({ error: 'Work not found' });
    res.json(work);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/works/:id — Delete work ────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const work = await Work.findByIdAndDelete(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    res.json({ message: 'Work deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── NOTES SUB-ROUTES ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/works/:id/notes — Add note (text or voice)
router.post('/:id/notes', async (req, res, next) => {
  try {
    const { type, content, audio_url, audio_data, duration, author } = req.body;

    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const noteObj = {
      type: type || 'text',
      content: content || '',
      audio_url: audio_url || '',
      audio_data: audio_data || '',
      duration: duration || 0,
      author: author || 'User',
    };

    work.notes.unshift(noteObj);
    await work.save();

    res.status(201).json(work.notes[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/works/:id/notes/:noteId — Delete note
router.delete('/:id/notes/:noteId', async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const note = work.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    note.deleteOne();
    await work.save();

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── DOCUMENTS SUB-ROUTES ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/works/:id/documents — Upload new document
router.post('/:id/documents', async (req, res, next) => {
  try {
    const { name, file_type, file_size, data } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Document name is required' });
    if (!data) return res.status(400).json({ error: 'Document file data is required' });

    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    let file_url = '';
    let public_id = '';

    // Upload to Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const uploadRes = await cloudinary.uploader.upload(data, {
          folder: `speednet/works/${work._id}/documents`,
          resource_type: 'auto',
          public_id: `${Date.now()}_${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        });
        file_url = uploadRes.secure_url;
        public_id = uploadRes.public_id;
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        file_url = data;
      }
    } else {
      file_url = data;
    }

    const docObj = {
      name: name.trim(),
      file_type: file_type || 'application/pdf',
      file_size: file_size || 0,
      file_url,
      public_id,
      data: file_url === data ? data : '',
      source: 'upload',
    };

    work.documents.unshift(docObj);
    await work.save();

    res.status(201).json(work.documents[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/works/:id/documents/from-customer — Attach document from customer
router.post('/:id/documents/from-customer', async (req, res, next) => {
  try {
    const { customer_id, document_id } = req.body;
    if (!customer_id || !document_id) {
      return res.status(400).json({ error: 'Customer ID and document ID are required' });
    }

    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const customer = await Customer.findById(customer_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const custDoc = customer.documents.id(document_id);
    if (!custDoc) return res.status(404).json({ error: 'Customer document not found' });

    const docObj = {
      name: custDoc.name,
      file_type: custDoc.file_type,
      file_size: custDoc.file_size,
      file_url: custDoc.file_url,
      public_id: custDoc.public_id,
      data: custDoc.data,
      source: 'customer',
      customer_id: customer._id,
      customer_doc_id: custDoc._id,
    };

    work.documents.unshift(docObj);
    await work.save();

    res.status(201).json(work.documents[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/works/:id/documents/:docId — Delete document
router.delete('/:id/documents/:docId', async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const doc = work.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete from Cloudinary if it was uploaded there
    if (doc.public_id && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(doc.public_id, { resource_type: 'raw' });
        await cloudinary.uploader.destroy(doc.public_id);
      } catch (cloudErr) {
        console.warn('Cloudinary delete warning:', cloudErr.message);
      }
    }

    doc.deleteOne();
    await work.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ── ISSUES SUB-ROUTES ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/works/:id/issues — Add issue
router.post('/:id/issues', async (req, res, next) => {
  try {
    const { title, description, status, priority } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Issue title is required' });

    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const issueObj = {
      title: title.trim(),
      description: (description || '').trim(),
      status: status || 'open',
      priority: priority || 'medium',
    };

    work.issues.unshift(issueObj);
    await work.save();

    res.status(201).json(work.issues[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/works/:id/issues/:issueId — Update issue
router.patch('/:id/issues/:issueId', async (req, res, next) => {
  try {
    const { title, description, status, priority } = req.body;

    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const issue = work.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    if (title !== undefined) issue.title = title.trim();
    if (description !== undefined) issue.description = description.trim();
    if (status !== undefined) issue.status = status;
    if (priority !== undefined) issue.priority = priority;

    await work.save();
    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/works/:id/issues/:issueId — Delete issue
router.delete('/:id/issues/:issueId', async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const issue = work.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    issue.deleteOne();
    await work.save();

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
