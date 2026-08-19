const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    username: { type: String, default: '', trim: true },
    password: { type: String, default: '' },
    url:      { type: String, default: '', trim: true },
    notes:    { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

credentialSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const documentSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    file_type:    { type: String, default: 'application/pdf' },
    file_size:    { type: Number, default: 0 },
    file_url:     { type: String, default: '' },
    public_id:    { type: String, default: '' },
    data:         { type: String, default: '' },
  },
  { timestamps: true }
);

documentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const customerSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    email:       { type: String, default: '', trim: true },
    address:     { type: String, default: '', trim: true },
    dob:         { type: String, default: '', trim: true }, // Format: YYYY-MM-DD
    passwords:   { type: [credentialSchema], default: [] },
    documents:   { type: [documentSchema], default: [] },
  },
  { timestamps: true }
);

customerSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id         = ret._id;
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    return ret;
  },
});

module.exports = mongoose.model('Customer', customerSchema);
