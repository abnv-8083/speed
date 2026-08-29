const mongoose = require('mongoose');

const workIssueSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  note_type:   { type: String, enum: ['text', 'voice'], default: 'text' },
  audio_data:  { type: String }, // base64 voice recording
  status:      { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  created_at:  { type: Date, default: Date.now },
}, { _id: true });

const workDocumentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  file_type:  { type: String },
  file_size:  { type: Number },
  data:       { type: String }, // base64 data URL
  file_url:   { type: String },
  source:     { type: String, enum: ['upload', 'customer'], default: 'upload' },
  uploaded_at:{ type: Date, default: Date.now },
}, { _id: true });

const workSchema = new mongoose.Schema({
  work_id:      { type: String, unique: true },
  title:        { type: String, required: true },
  description:  { type: String, default: '' },

  // Customer link (optional — can create work without linking to customer management)
  customer_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customer_name:{ type: String, default: '' },

  // Contact details (always stored, copied from customer or entered manually)
  contact_name: { type: String, default: '' },
  contact_phone:{ type: String, default: '' },
  contact_email:{ type: String, default: '' },

  // Work schedule
  end_date:     { type: Date, required: true },
  status:       { type: String, enum: ['new', 'in_progress', 'completed', 'closed'], default: 'new' },

  // Embedded sub-documents
  issues:       [workIssueSchema],
  documents:    [workDocumentSchema],
  notes:        [{ type: String }], // simple text notes array

  // Popup tracking
  popup_dismissed_at: { type: Date, default: null },

}, { timestamps: true });

// Auto-generate work_id using atomic counter to avoid race conditions
const counterSchema = new mongoose.Schema({
  _id:  { type: String, default: 'work' },
  seq:  { type: Number, default: 0 },
});
const Counter = mongoose.model('WorkCounter', counterSchema);

workSchema.pre('save', async function(next) {
  try {
    if (!this.work_id) {
      const counter = await Counter.findByIdAndUpdate(
        'work',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.work_id = `WRK-${String(counter.seq).padStart(4, '0')}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Work', workSchema);
