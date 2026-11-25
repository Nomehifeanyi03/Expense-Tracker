const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["expense", "income"], default: "expense" },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
    },
    date: { type: Date, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "Transfer", "Mobile money"],
      default: "Cash",
    },
    description: { type: String, trim: true, maxlength: 80, default: "" },
    notes: { type: String, trim: true, maxlength: 200, default: "" },
    tags: [{ type: String, trim: true }],

    originalAmount: { type: Number },
    originalCurrency: { type: String },
    exchangeRate: { type: Number },

    receipt: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
    },

    recurring: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      startDate: Date,
      nextRunDate: Date,
      endDate: Date,
    },
    generatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
