const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { calculateCarryOvers } = require('../utils/rollover');

const round2 = (n) => Math.round(n * 100) / 100;

// Set a budget (creates it, or updates it if it already exists)
exports.setBudget = async (req, res) => {
  try {
    const { category, amount } = req.body;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    let categoryId = null;

    if (category) {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const ownedCategory = await Category.findOne({ _id: category, user: req.user._id });
      if (!ownedCategory) {
        return res.status(400).json({ message: 'Category not found' });
      }
      categoryId = ownedCategory._id;
    }

    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: categoryId },
      { amount: amt },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get budgets for a month, with spent and remaining amounts
exports.getBudgets = async (req, res) => {
  try {
    const now = new Date();
    const month =
      req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'Month must look like 2026-11' });
    }

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));

    const spentByCategory = await Transaction.aggregate([
      { $match: { user: req.user._id, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } },
    ]);

    const spentMap = {};
    let totalSpent = 0;
    spentByCategory.forEach((item) => {
      spentMap[item._id.toString()] = item.spent;
      totalSpent += item.spent;
    });

    const budgets = await Budget.find({ user: req.user._id }).populate('category', 'name color');

    const carry = await calculateCarryOvers(req.user, budgets, start);

    const build = (budget, spent) => {
      const carryOver = carry[budget._id.toString()] || 0;
      const available = budget.amount + carryOver;

      return {
        _id: budget._id,
        category: budget.category,
        baseAmount: budget.amount,
        carryOver: round2(carryOver),
        amount: round2(available),
        spent: round2(spent),
        remaining: round2(available - spent),
        percent: Math.round((spent / available) * 100),
      };
    };

    const overall = budgets.find((b) => !b.category);
    const categories = budgets
      .filter((b) => b.category)
      .map((b) => build(b, spentMap[b.category._id.toString()] || 0));

    res.json({
      month,
      rollover: Boolean(req.user.rolloverEnabled),
      totalSpent: round2(totalSpent),
      overall: overall ? build(overall, totalSpent) : null,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove a budget
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const budget = await Budget.findOneAndDelete({ _id: id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ message: 'Budget removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};