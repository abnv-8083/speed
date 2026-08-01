const mongoose = require('mongoose');

const printLogSchema = new mongoose.Schema(
  {
    job_name:     { type: String, required: true, trim: true },
    paper_size:   { type: String, enum: ['A4', 'A3', 'A5'], required: true },
    color_mode:   { type: String, enum: ['Color', 'B&W'], required: true },
    quantity:     { type: Number, required: true, min: 1 },
    status:       { type: String, default: 'Completed' },
    source:       { type: String, default: 'Manual Log' },
    printer_name: { type: String, default: '' },
    needs_review: { type: Boolean, default: false },  // true = variant was guessed by agent
    review_note:  { type: String, default: '' },       // reason it needs review
  },
  { timestamps: true }
);

printLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    return ret;
  },
});

module.exports = mongoose.model('PrintLog', printLogSchema);
