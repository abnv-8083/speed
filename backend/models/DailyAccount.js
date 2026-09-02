const mongoose = require('mongoose');

/**
 * DailyAccount — one document per day.
 * Tracks opening balances for Cash Box and Bank Account,
 * plus manual transfers between them.
 *
 * Current balance = opening + sales_in - sales_out + transfers
 * Sales are auto-calculated from Invoice/Expense/QuickBill models
 * by payment_method mapping.
 */
const transferSchema = new mongoose.Schema({
  direction: {
    type: String,
    enum: ['cash_to_bank', 'bank_to_cash'],
    required: true,
  },
  amount:    { type: Number, required: true, min: 0.01 },
  note:      { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const dailyAccountSchema = new mongoose.Schema(
  {
    date:          { type: String, required: true, unique: true }, // "YYYY-MM-DD"
    cash_opening:  { type: Number, default: 0, min: 0 },
    bank_opening:  { type: Number, default: 0, min: 0 },
    transfers:     { type: [transferSchema], default: [] },
    note:          { type: String, default: '' },
  },
  { timestamps: true }
);

dailyAccountSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

module.exports = mongoose.model('DailyAccount', dailyAccountSchema);
