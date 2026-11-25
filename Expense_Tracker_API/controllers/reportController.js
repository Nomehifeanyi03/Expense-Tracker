const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');

const round2 = (n) => Math.round(n * 100) / 100;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// The current month as text, like "2026-11"
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// The first moment of a month, moved forward or back by "offset" months
const monthStart = (month, offset = 0) => {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1 + offset, 1));
};

// Turns a date into text like "2026-11"
const monthLabel = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

// Adds up income and expenses between two dates
const sumByType = async (userId, start, end) => {
  const rows = await Transaction.aggregate([
    { $match: { user: userId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const result = { income: 0, expense: 0 };
  rows.forEach((row) => {
    result[row._id] = row.total;
  });
  return result;
};

// Adds up expenses per category between two dates (the pie chart data)
const spendingByCategory = async (userId, start, end) => {
  const rows = await Transaction.aggregate([
    { $match: { user: userId, type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  const categories = await Category.find({
    _id: { $in: rows.map((row) => row._id) },
    user: userId,
  }).select('name color');

  const lookup = {};
  categories.forEach((c) => {
    lookup[c._id.toString()] = c;
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return rows.map((row) => {
    const c = lookup[row._id.toString()];
    return {
      category: c ? { _id: c._id, name: c.name, color: c.color } : null,
      total: round2(row.total),
      percent: grandTotal ? Math.round((row.total / grandTotal) * 100) : 0,
    };
  });
};

// Dashboard summary for one month
exports.getDashboard = async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    if (!MONTH_REGEX.test(month)) {
      return res.status(400).json({ message: 'Month must look like 2026-11' });
    }

    const start = monthStart(month);
    const end = monthStart(month, 1);

    const [totals, byCategory, recent, overallBudget] = await Promise.all([
      sumByType(req.user._id, start, end),
      spendingByCategory(req.user._id, start, end),
      Transaction.find({ user: req.user._id })
        .populate('category', 'name color')
        .sort({ date: -1, createdAt: -1 })
        .limit(5),
      Budget.findOne({ user: req.user._id, category: null }),
    ]);

    const budget = overallBudget
      ? {
          amount: overallBudget.amount,
          spent: round2(totals.expense),
          remaining: round2(overallBudget.amount - totals.expense),
          percent: Math.round((totals.expense / overallBudget.amount) * 100),
        }
      : null;

    res.json({
      month,
      income: round2(totals.income),
      expenses: round2(totals.expense),
      balance: round2(totals.income - totals.expense),
      budget,
      byCategory,
      recent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reports for a chosen period
exports.getReports = async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    if (!MONTH_REGEX.test(month)) {
      return res.status(400).json({ message: 'Month must look like 2026-11' });
    }

    const months = parseInt(req.query.months) || 1;
    if (![1, 3, 6, 12].includes(months)) {
      return res.status(400).json({ message: 'Months must be 1, 3, 6 or 12' });
    }

    const start = monthStart(month, -(months - 1));
    const end = monthStart(month, 1);
    const prevStart = monthStart(month, -(2 * months - 1));

    const trendCount = Math.max(months, 6);
    const trendStart = monthStart(month, -(trendCount - 1));

    const [current, previous, byCategory, monthlyRows] = await Promise.all([
      sumByType(req.user._id, start, end),
      sumByType(req.user._id, prevStart, start),
      spendingByCategory(req.user._id, start, end),
      Transaction.aggregate([
        { $match: { user: req.user._id, date: { $gte: trendStart, $lt: end } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const monthly = [];
    for (let i = trendCount - 1; i >= 0; i--) {
      monthly.push({ month: monthLabel(monthStart(month, -i)), income: 0, expenses: 0 });
    }
    monthlyRows.forEach((row) => {
      const label = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
      const entry = monthly.find((m) => m.month === label);
      if (entry) {
        if (row._id.type === 'income') {
          entry.income = round2(row.total);
        } else {
          entry.expenses = round2(row.total);
        }
      }
    });

    const change = (now, before) => ({
      current: round2(now),
      previous: round2(before),
      difference: round2(now - before),
      percent: before ? Math.round(((now - before) / before) * 100) : null,
    });

    res.json({
      period: { months, from: monthLabel(start), to: month },
      summary: {
        income: round2(current.income),
        expenses: round2(current.expense),
        net: round2(current.income - current.expense),
      },
      byCategory,
      monthly,
      comparison: {
        expenses: change(current.expense, previous.expense),
        income: change(current.income, previous.income),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};