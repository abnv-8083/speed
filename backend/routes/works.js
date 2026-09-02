const express = require('express');
const router = express.Router();
const Work = require('../models/Work');
const Customer = require('../models/Customer');
const { broadcast } = require('../websocket');

// ── List Works ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { work_id: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } },
        { contact_name: { $regex: search, $options: 'i' } },
      ];
    }

    let query = Work.find(filter);
    if (sort === 'end_date') query = query.sort({ end_date: 1 });
    else if (sort === 'priority') query = query.sort({ status: 1, end_date: 1 });
    else query = query.sort({ createdAt: -1 });

    const works = await query.lean();
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const works = await Work.find().lean();
    const byStatus = {};
    works.forEach(w => { byStatus[w.status] = (byStatus[w.status] || 0) + 1; });
    res.json({ total: works.length, by_status: byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Due Soon (for popup) ─────────────────────────────────────
router.get('/due-soon', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 1;
    const now = new Date();
    const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const works = await Work.find({
      end_date: { $gte: now, $lte: cutoff },
      status: { $in: ['new', 'in_progress'] },
    }).lean();

    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Work ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id).lean();
    if (!work) return res.status(404).json({ error: 'Work not found' });
    res.json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Work ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    console.log('[WORK] Create request body:', JSON.stringify(req.body, null, 2));
    const work = new Work(req.body);
    await work.save();
    console.log('[WORK] Created:', work.work_id, work._id);
    broadcast('works', 'created', work);
    res.status(201).json(work);
  } catch (err) {
    console.error('[WORK] Create error:', err.message, err);
    res.status(400).json({ error: err.message });
  }
});

// ── Update Work ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const work = await Work.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!work) return res.status(404).json({ error: 'Work not found' });
    broadcast('works', 'updated', work);
    res.json(work);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Delete Work ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const work = await Work.findByIdAndDelete(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    broadcast('works', 'deleted', { id: req.params.id });
    res.json({ message: 'Work deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add Issue ─────────────────────────────────────────────────
router.post('/:id/issues', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    work.issues.push(req.body);
    await work.save();
    broadcast('works', 'issue_added', { work_id: work._id, issue: work.issues[work.issues.length - 1] });
    res.status(201).json(work.issues[work.issues.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Update Issue ──────────────────────────────────────────────
router.patch('/:id/issues/:issueId', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    const issue = work.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    Object.assign(issue, req.body);
    await work.save();
    broadcast('works', 'issue_updated', { work_id: work._id, issue });
    res.json(issue);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Delete Issue ──────────────────────────────────────────────
router.delete('/:id/issues/:issueId', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    work.issues = work.issues.filter(i => i._id.toString() !== req.params.issueId);
    await work.save();
    broadcast('works', 'issue_deleted', { work_id: work._id, issue_id: req.params.issueId });
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add Document ──────────────────────────────────────────────
router.post('/:id/documents', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    work.documents.push(req.body);
    await work.save();
    res.status(201).json(work.documents[work.documents.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Import Document from Customer ─────────────────────────────
router.post('/:id/documents/from-customer', async (req, res) => {
  try {
    const { customer_id, document_id } = req.body;
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });

    const customer = await Customer.findById(customer_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const doc = customer.documents.id(document_id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    work.documents.push({
      name: doc.name,
      file_type: doc.file_type,
      file_size: doc.file_size,
      data: doc.data,
      file_url: doc.file_url,
      source: 'customer',
    });
    await work.save();
    res.status(201).json(work.documents[work.documents.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Delete Document ───────────────────────────────────────────
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    work.documents = work.documents.filter(d => d._id.toString() !== req.params.docId);
    await work.save();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add Note ──────────────────────────────────────────────────
router.post('/:id/notes', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    work.notes.push(req.body.content || req.body);
    await work.save();
    res.status(201).json({ message: 'Note added' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Delete Note ───────────────────────────────────────────────
router.delete('/:id/notes/:noteIndex', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work not found' });
    const idx = parseInt(req.params.noteIndex);
    if (idx >= 0 && idx < work.notes.length) {
      work.notes.splice(idx, 1);
      await work.save();
    }
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dismiss Popup ─────────────────────────────────────────────
router.patch('/:id/dismiss-popup', async (req, res) => {
  try {
    const work = await Work.findByIdAndUpdate(
      req.params.id,
      { popup_dismissed_at: new Date() },
      { new: true }
    );
    if (!work) return res.status(404).json({ error: 'Work not found' });
    broadcast('works', 'popup_dismissed', { work_id: work._id });
    res.json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
