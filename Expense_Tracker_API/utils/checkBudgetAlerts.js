const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');

const round2 = (n) => Math.round(n * 100) / 100;

// Adds up the expenses in a date range, for one category or for all of them
const totalSpent = async (userId, start, end, categoryId) => {
  const match = { user: userId, type: 'expense', date: { $gte: start, $lt: end } };
  if (categoryId) match.category = categoryId;

  const result = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return result.length ? result[0].total : 0;
};

// Saves a notification, but ignores it if the same alert already exists
const createAlert = async (data) => {
  try {
    await Notification.create(data);
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

// Checks the budgets after an expense is saved and creates alerts at 80% and 100%
const checkBudgetAlerts = async (user, categoryId, date) => {
  try {
    const when = new Date(date);
    const year = when.getUTCFullYear();
    const mon = when.getUTCMonth();
    const start = new Date(Date.UTC(year, mon, 1));
    const end = new Date(Date.UTC(year, mon + 1, 1));
    const period = `${year}-${String(mon + 1).padStart(2, '0')}`;
    const monthName = start.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const budgets = await Budget.find({
      user: user._id,
      $or: [{ category: categoryId }, { category: null }],
    });

    for (const budget of budgets) {
      const isOverall = !budget.category;
      const spent = await totalSpent(user._id, start, end, isOverall ? null : budget.category);
      const percent = (spent / budget.amount) * 100;

      if (percent < 80) continue;

      const reached = percent >= 100;

      let name = 'Your overall budget';
      if (!isOverall) {
        const category = await Category.findById(budget.category).select('name');
        name = category ? category.name : 'This category';
      }

      await createAlert({
        user: user._id,
        type: reached ? 'budget_reached' : 'budget_warning',
        title: reached ? 'Budget reached' : 'Budget warning',
        message: `${name} has used ${Math.round(percent)}% of its ${monthName} budget (${user.defaultCurrency} ${round2(spent)} of ${user.defaultCurrency} ${budget.amount}).`,
        category: isOverall ? null : budget.category,
        period,
      });
    }
  } catch (error) {
    console.error('Budget alert check failed:', error.message);
  }
};

module.exports = checkBudgetAlerts;