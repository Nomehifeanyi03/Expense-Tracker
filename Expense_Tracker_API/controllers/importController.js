const { parse } = require('csv-parse/sync');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const checkBudgetAlerts = require('../utils/checkBudgetAlerts');
const { TYPES, PAYMENT_METHODS } = require('../utils/buildTransactionFilter');

const MAX_ROWS = 1000;
const MAX_REPORTED_ERRORS = 20;
const REQUIRED_COLUMNS = ['date', 'amount', 'category'];

// Turns any value into trimmed text
const text = (value) => String(value === undefined || value === null ? '' : value).trim();

// Undoes the apostrophe our export puts in front of cells that start with = + - or @
const unprotect = (value) => value.replace(/^'(?=[=+\-@])/, '');

// Turns "work; lunch" or "work, lunch" into a clean list of tags
const parseTags = (value) =>
  [...new Set(value.split(/[;,]/).map((t) => t.trim()).filter(Boolean))].slice(0, 10);

// Accepts only real dates written like 2026-11-24
const parseDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(date) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
};

// Import transactions from a CSV file
exports.importCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose a CSV file to upload' });
    }

    const content = req.file.buffer.toString('utf8');
    if (content.includes('\u0000')) {
      return res.status(400).json({ message: 'This does not look like a text file' });
    }

    let records;
    try {
      records = parse(content, {
        bom: true,
        columns: (header) => header.map((h) => h.toLowerCase().replace(/[^a-z]/g, '')),
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError) {
      return res.status(400).json({ message: 'The file is not a valid CSV file' });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: 'The file has no rows to import' });
    }
    if (records.length > MAX_ROWS) {
      return res.status(400).json({ message: `Too many rows. The limit is ${MAX_ROWS} per file.` });
    }

    const missing = REQUIRED_COLUMNS.filter((name) => !(name in records[0]));
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing column(s): ${missing.join(', ')}` });
    }

    const categories = await Category.find({ user: req.user._id }).select('name');
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c._id]));
    const otherId = categoryMap.get('other');

    const docs = [];
    const errors = [];
    let unknownCategories = 0;

    records.forEach((row, index) => {
      const problems = [];

      const date = parseDate(text(row.date));
      if (!date) problems.push('date must look like 2026-11-24');

      const amount = Number(text(row.amount).replace(/,/g, ''));
      if (!(amount >= 0.01 && amount <= 1e12)) {
        problems.push('amount must be between 0.01 and 1,000,000,000,000');
      }

      const type = text(row.type).toLowerCase() || 'expense';
      if (!TYPES.includes(type)) problems.push('type must be Expense or Income');

      const methodText = text(row.paymentmethod);
      const method = methodText
        ? PAYMENT_METHODS.find((m) => m.toLowerCase() === methodText.toLowerCase())
        : 'Cash';
      if (!method) problems.push('payment method must be Cash, Card, Transfer or Mobile money');

      const categoryName = unprotect(text(row.category));
      let categoryId = null;
      if (!categoryName) {
        problems.push('category is required');
      } else {
        const found = categoryMap.get(categoryName.toLowerCase());
        categoryId = found || otherId;
        if (!found) unknownCategories++;
        if (!categoryId) problems.push('category not found');
      }

      const description = unprotect(text(row.description));
      const notes = unprotect(text(row.notes));
      if (description.length > 80) problems.push('description is longer than 80 characters');
      if (notes.length > 200) problems.push('notes are longer than 200 characters');

      if (problems.length > 0) {
        errors.push({ row: index + 2, problems });
        return;
      }

      docs.push({
        user: req.user._id,
        type,
        amount: Math.round(amount * 100) / 100,
        date,
        category: categoryId,
        paymentMethod: method,
        description,
        notes,
        tags: parseTags(unprotect(text(row.tags))),
      });
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: `Nothing was imported. ${errors.length} row(s) have problems. Fix them and upload the file again.`,
        errors: errors.slice(0, MAX_REPORTED_ERRORS),
      });
    }

    await Transaction.insertMany(docs);

    const checked = new Set();
    for (const doc of docs) {
      if (doc.type !== 'expense') continue;
      const key = `${doc.category}|${doc.date.toISOString().slice(0, 7)}`;
      if (checked.has(key)) continue;
      checked.add(key);
      await checkBudgetAlerts(req.user, doc.category, doc.date);
    }

    res.status(201).json({
      message: `Imported ${docs.length} transactions`,
      imported: docs.length,
      unknownCategories,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};