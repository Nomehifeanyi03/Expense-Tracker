const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const checkBudgetAlerts = require('../utils/checkBudgetAlerts');
const { removeFile } = require('../utils/receiptFiles');
const { parseRecurring } = require('../utils/recurrence');
const { buildTransactionFilter, TYPES, PAYMENT_METHODS } = require('../utils/buildTransactionFilter');

// Turns "work, lunch" or ["work", "lunch"] into a clean list of tags
const parseTags = (tags) => {
  if (tags === undefined) return undefined;
  const list = Array.isArray(tags) ? tags : String(tags).split(',');
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 10);
};

// Create a transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      type = 'expense',
      amount,
      date,
      category,
      paymentMethod = 'Cash',
      description,
      notes,
      tags,
      recurring,
    } = req.body;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ message: 'A valid date is required' });
    }
    if (!category || !mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!TYPES.includes(type)) {
      return res.status(400).json({ message: 'Type must be expense or income' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const recurrence = parseRecurring(recurring, date);
    if (recurrence.error) {
      return res.status(400).json({ message: recurrence.error });
    }

    const ownedCategory = await Category.findOne({ _id: category, user: req.user._id });
    if (!ownedCategory) {
      return res.status(400).json({ message: 'Category not found' });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: amt,
      date,
      category: ownedCategory._id,
      paymentMethod,
      description,
      notes,
      tags: parseTags(tags),
      recurring: recurrence.recurring,
    });

    if (type === 'expense') {
      await checkBudgetAlerts(req.user, ownedCategory._id, transaction.date);
    }

    await transaction.populate('category', 'name color');
    res.status(201).json(transaction);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List transactions with filters, search and paging
exports.getTransactions = async (req, res) => {
  try {
    const { filter, error } = buildTransactionFilter(req.user._id, req.query);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('category', 'name color')
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get one transaction
exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user._id }).populate(
      'category',
      'name color'
    );
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit a transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const { type, amount, date, category, paymentMethod, description, notes, tags, recurring } =
      req.body;

    if (type !== undefined) {
      if (!TYPES.includes(type)) {
        return res.status(400).json({ message: 'Type must be expense or income' });
      }
      transaction.type = type;
    }
    if (amount !== undefined) {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }
      transaction.amount = amt;
    }
    if (date !== undefined) {
      if (!date || isNaN(new Date(date))) {
        return res.status(400).json({ message: 'A valid date is required' });
      }
      transaction.date = date;
    }
    if (category !== undefined) {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ message: 'Category is required' });
      }
      const ownedCategory = await Category.findOne({ _id: category, user: req.user._id });
      if (!ownedCategory) {
        return res.status(400).json({ message: 'Category not found' });
      }
      transaction.category = ownedCategory._id;
    }
    if (paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      transaction.paymentMethod = paymentMethod;
    }
    if (description !== undefined) transaction.description = description;
    if (notes !== undefined) transaction.notes = notes;
    if (tags !== undefined) transaction.tags = parseTags(tags);

    if (recurring !== undefined) {
      const recurrence = parseRecurring(recurring, transaction.date);
      if (recurrence.error) {
        return res.status(400).json({ message: recurrence.error });
      }
      transaction.recurring = recurrence.clear ? undefined : recurrence.recurring;
    }

    await transaction.save();

    if (transaction.type === 'expense') {
      await checkBudgetAlerts(req.user, transaction.category, transaction.date);
    }

    await transaction.populate('category', 'name color');
    res.json(transaction);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findOneAndDelete({ _id: id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.receipt && transaction.receipt.fileName) {
      await removeFile(transaction.receipt.fileName);
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List the entries that repeat (for a "manage repeats" screen)
exports.getRecurring = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user._id,
      'recurring.frequency': { $exists: true, $ne: null },
    })
      .populate('category', 'name color')
      .sort({ 'recurring.nextRunDate': 1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};