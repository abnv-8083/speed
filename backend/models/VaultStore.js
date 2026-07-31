const mongoose = require('mongoose');

const vaultStoreSchema = new mongoose.Schema(
  {
    device_id:      { type: String, required: true, unique: true },
    salt:           { type: String, default: null },
    iv:             { type: String, default: null },
    encrypted_data: { type: String, default: null },
  },
  { timestamps: true }
);

vaultStoreSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => { ret.id = ret._id; return ret; },
});

module.exports = mongoose.model('VaultStore', vaultStoreSchema);
