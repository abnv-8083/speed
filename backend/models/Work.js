const mongoose = require('mongoose');

// ── Sub-schemas ─────────────────────────────────────────────

const workNoteSchema = new mongoose.Schema(
  {
    type:     { type: String, enum: ['text', 'voice'], required: true },
    content:  { type: String, default: '' },              // text content or audio URL/data
    audio_url:{ type: String, default: '' },              // for voice notes
    audio_data:{ type: String, default: '' },             // base64 audio data (fallback)
    duration: { type: Number, default: 0 },               // voice note duration in seconds
    author:   { type: String, default: 'User' },
  },
  { timestamps: true }
);

workNoteSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const workDocumentSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    file_type:    { type: String, default: 'application/pdf' },
    file_size:    { type: Number, default: 0 },
    file_url:     { type: String, default: '' },
    public_id:    { type: String, default: '' },
    data:         { type: String, default: '' },          // data URI fallback
    source:       { type: String, enum: ['upload', 'customer'], default: 'upload' }, // from customer or new upload
    customer_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, // linked customer
    customer_doc_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // original doc id in customer
  },
  { timestamps: true }
);

workDocumentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const workIssueSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status:      { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    priority:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  },
  { timestamps: true }
);

workIssueSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const timeLogSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    start_time:  { type: Date, required: true },
    end_time:    { type: Date, default: null },
    duration:    { type: Number, default: 0 },             // duration in seconds
    billable:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

timeLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

// ── Main Work Schema ────────────────────────────────────────

const workSchema = new mongoose.Schema(
  {
    work_id:     { type: String, unique: true },          // WRK-0001 auto-generated
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Customer info (either linked or manual)
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customer_name: { type: String, default: 'Walk-in' },

    // Status tracking
    status: {
      type: String,
      enum: ['new', 'pending', 'in_progress', 'on_hold', 'completed', 'closed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Dates
    start_date:  { type: String, default: '' },
    due_date:    { type: String, default: '' },
    completed_at:{ type: String, default: '' },

    // Content
    notes:       { type: [workNoteSchema], default: [] },
    documents:   { type: [workDocumentSchema], default: [] },
    issues:      { type: [workIssueSchema], default: [] },
    time_logs:   { type: [timeLogSchema], default: [] },

    // Payment
    payment_method: { type: String, enum: ['Cash', 'UPI', 'UPI - Bank', 'Cash - Bank', 'Cheque', 'Other'], default: 'Cash' },

    // Metadata
    tags:        { type: [String], default: [] },
    estimated_hours: { type: Number, default: 0 },
    actual_hours:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

workSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    return ret;
  },
});

// Auto-generate work_id before saving
workSchema.pre('save', async function () {
  if (this.isNew && !this.work_id) {
    const count = await mongoose.model('Work').countDocuments();
    this.work_id = `WRK-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Work', workSchema);
