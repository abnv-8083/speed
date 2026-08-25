const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    type:       { type: String, enum: ['product', 'service'], default: 'product' },
    price:      { type: Number, required: true, min: 0 },
    cost_price: { type: Number, default: 0, min: 0 },  // purchase/cost price
    stock:      { type: Number, min: 0, default: 0 },
    is_print:   { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false },
    show_on_website: { type: Boolean, default: false },
    selling_price: { type: Number, default: 0 },
    description:   { type: String, default: '' },
    images:        [{ url: String, alt: String }],
  },
  { timestamps: true }
);

// Virtual: expose Mongo _id as numeric-style string id for frontend compatibility
productSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Product', productSchema);
