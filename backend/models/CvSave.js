const mongoose = require('mongoose');

const cvSaveSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    template: { type: String, default: '' },
    data:     { type: mongoose.Schema.Types.Mixed, default: {} },
    saved_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

cvSaveSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id      = ret._id;
    ret.savedAt = ret.saved_at;
    return ret;
  },
});

module.exports = mongoose.model('CvSave', cvSaveSchema);
