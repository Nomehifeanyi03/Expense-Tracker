const mongoose = require('mongoose');

const TYPES = ['expense', 'income'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Transfer', 'Mobile money'];

// Makes user-typed text safe to use inside a search pattern
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Turns the filters in the URL into a database filter.
// Returns { filter } when everything is valid, or { error } with a message.
const buildTransactionFilter = (userId, query) => {
  const { type, category, paymentMethod, startDate, endDate, minAmount, maxAmount, search } = query;
  const filter = { user: userId };

  if (type) {
    if (!TYPES.includes(type)) return { error: 'Invalid type filter' };
    filter.type = type;
  }

  if (category) {
    if (!mongoose.isValidObjectId(category)) return { error: 'Invalid category filter' };
    filter.category = category;
  }

  if (paymentMethod) {
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return { error: 'Invalid payment method filter' };
    }
    filter.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start)) return { error: 'Invalid start date' };
      filter.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end)) return { error: 'Invalid end date' };
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (minAmount || maxAmount) {
    filter.amount = {};
    if (minAmount) {
      const min = Number(minAmount);
      if (Number.isNaN(min)) return { error: 'Invalid minimum amount' };
      filter.amount.$gte = min;
    }
    if (maxAmount) {
      const max = Number(maxAmount);
      if (Number.isNaN(max)) return { error: 'Invalid maximum amount' };
      filter.amount.$lte = max;
    }
  }

  if (typeof search === 'string' && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ description: pattern }, { notes: pattern }, { tags: pattern }];
  }

  return { filter };
};

module.exports = { buildTransactionFilter, TYPES, PAYMENT_METHODS };