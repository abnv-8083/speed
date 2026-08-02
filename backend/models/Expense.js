const mongoose = require('mongoose');

/**
 * Expense — records a business expense for P&L tracking.
 *
 * Categories map to common small-business expense types.
 * expense_date is stored as "YYYY-MM-DD" string for easy date filtering.
 */
const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Supplies', 'Maintenance',
  'Marketing', 'Transport', 'Equipment', 'Taxes', 'Miscellaneous',
];

const expenseSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    amount:       { type: Number, required: true, min: 0 },
    category:     { type: String, enum: CATEGORIES, default: 'Miscellaneous' },
    expense_date: { type: String, required: true },  // "YYYY-MM-DD"
    note:         { type: String, default: '' },
  },
  { timestamps: true }
);

expenseSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    return ret;
  },
});

expenseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Expense', expenseSchema);
