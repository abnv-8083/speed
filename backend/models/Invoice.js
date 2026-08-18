const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    customer_name: { type: String, default: 'Walk-in Customer', trim: true },
    total_amount:   { type: Number, required: true, min: 0 },
    discount:       { type: Number, default: 0, min: 0 },
    payment_method: { type: String, default: 'Cash' },
  },
  { timestamps: true }
);

invoiceSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    return ret;
  },
});

module.exports = mongoose.model('Invoice', invoiceSchema);
