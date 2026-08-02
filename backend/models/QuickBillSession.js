const mongoose = require('mongoose');

/**
 * QuickBillSession
 * One document per "bill" created in the Quick Bill page.
 * Resets at midnight — sessions from previous days are kept for history.
 *
 * items[] is embedded (no separate collection needed).
 */
const itemSchema = new mongoose.Schema({
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  product_name: { type: String, required: true },
  price:        { type: Number, required: true, min: 0 },
  quantity:     { type: Number, required: true, min: 1 },
  line_total:   { type: Number, required: true, min: 0 },
}, { _id: true });

const quickBillSchema = new mongoose.Schema(
  {
    bill_number:  { type: Number },                          // auto-incremented per day
    items:        { type: [itemSchema], default: [] },
    total:        { type: Number, required: true, min: 0 },
    note:         { type: String, default: '' },
    billed_date:  { type: String, required: true },          // "YYYY-MM-DD" for easy day grouping
  },
  { timestamps: true }
);

quickBillSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    return ret;
  },
});

module.exports = mongoose.model('QuickBillSession', quickBillSchema);
