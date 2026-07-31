const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loan_type:   { type: String, enum: ['lent', 'borrowed'], required: true },
    person_name: { type: String, required: true, trim: true },
    amount:      { type: Number, required: true, min: 0 },
    amount_paid: { type: Number, default: 0, min: 0 },
    status:      { type: String, enum: ['active', 'settled'], default: 'active' },
    due_date:    { type: Date, default: null },
  },
  { timestamps: true }
);

loanSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    // due_date as ISO string slice for date input compatibility
    if (ret.due_date) ret.due_date = ret.due_date.toISOString();
    return ret;
  },
});

module.exports = mongoose.model('Loan', loanSchema);
