const mongoose = require('mongoose');

/**
 * Maps a Windows printer name to its default paper variant.
 * Used by printSpoolerAgent.js to resolve paper_size + color_mode
 * when Windows WMI doesn't report them reliably.
 *
 * Example:
 *   printer_name: "HP LaserJet M404dn"
 *   paper_size:   "A4"
 *   color_mode:   "B&W"
 */
const printerConfigSchema = new mongoose.Schema(
  {
    printer_name: { type: String, required: true, unique: true, trim: true },
    paper_size:   { type: String, enum: ['A4', 'A3', 'A5'], required: true },
    color_mode:   { type: String, enum: ['Color', 'B&W'],   required: true },
    notes:        { type: String, default: '' },
  },
  { timestamps: true }
);

printerConfigSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => { ret.id = ret._id; return ret; },
});

module.exports = mongoose.model('PrinterConfig', printerConfigSchema);
