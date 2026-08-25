const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    work_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
    work_title:  { type: String, default: '' },
    type:        { type: String, enum: ['created', 'status_changed', 'issue_added', 'issue_updated', 'due_soon', 'overdue', 'note_added', 'document_added'], required: true },
    message:     { type: String, required: true },
    read:        { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
