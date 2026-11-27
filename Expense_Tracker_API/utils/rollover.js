const Transaction = require('../models/Transaction');

const MAX_MONTHS = 12;

// The first moment of a month, moved forward or back by "offset" months
const monthStart = (date, offset = 0) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));

// Works out how much unused budget each budget brings into the month that starts at targetStart
const calculateCarryOvers = async (user, budgets, targetStart) => {
  const carry = {};
  budgets.forEach((budget) => {
    carry[budget._id.toString()] = 0;
  });

  if (!user.rolloverEnabled || budgets.length === 0) return carry;

  const earliest = monthStart(targetStart, -MAX_MONTHS);

  const rows = await Transaction.aggregate([
    { $match: { user: user._id, type: 'expense', date: { $gte: earliest, $lt: targetStart } } },
    {
      $group: {
        _id: { category: '$category', year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const spent = {};
  rows.forEach((row) => {
    const label = `${row._id.year}-${row._id.month}`;
    const categoryKey = `${row._id.category}|${label}`;
    const allKey = `all|${label}`;
    spent[categoryKey] = (spent[categoryKey] || 0) + row.total;
    spent[allKey] = (spent[allKey] || 0) + row.total;
  });

  budgets.forEach((budget) => {
    const who = budget.category ? (budget.category._id || budget.category).toString() : 'all';

    let cursor = monthStart(budget.createdAt);
    if (cursor < earliest) cursor = earliest;

    let unused = 0;
    while (cursor < targetStart) {
      const label = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`;
      const available = budget.amount + unused;
      unused = Math.max(0, available - (spent[`${who}|${label}`] || 0));
      cursor = monthStart(cursor, 1);
    }

    carry[budget._id.toString()] = unused;
  });

  return carry;
};

module.exports = { calculateCarryOvers };