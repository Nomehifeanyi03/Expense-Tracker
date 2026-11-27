const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['budget_warning', 'budget_reached', 'weekly_summary', 'recurring_created', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    period: { type: String, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.index(
  { user: 1, category: 1, type: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $in: ['budget_warning', 'budget_reached'] } },
  }
);

module.exports = mongoose.model('Notification', notificationSchema);