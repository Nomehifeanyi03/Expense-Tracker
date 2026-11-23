const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    color: { type: String, default: '#94a3b8' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index(
  { user: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Category', categorySchema);