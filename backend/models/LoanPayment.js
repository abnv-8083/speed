const mongoose = require('mongoose');

const loanPaymentSchema = new mongoose.Schema(
  {
    loan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    amount:  { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

loanPaymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    return ret;
  },
});

module.exports = mongoose.model('LoanPayment', loanPaymentSchema);
