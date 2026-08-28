const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    invoice_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    product_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity:      { type: Number, required: true, min: 1 },
    price_at_time: { type: Number, required: true, min: 0 },  // service charge / selling price
    cost_price:    { type: Number, default: 0, min: 0 },      // service price / cost price at time of sale
  },
  { timestamps: true }
);

invoiceItemSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('InvoiceItem', invoiceItemSchema);
