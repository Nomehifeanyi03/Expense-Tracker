const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { buildTransactionFilter } = require('../utils/buildTransactionFilter');

const MAX_EXPORT = 5000;

const COLUMNS = [
  { label: 'Date', width: 70, align: 'left' },
  { label: 'Category', width: 95, align: 'left' },
  { label: 'Description', width: 170, align: 'left' },
  { label: 'Method', width: 75, align: 'left' },
  { label: 'Amount', width: 105, align: 'right' },
];
const LEFT = 40;
const TABLE_WIDTH = 515;
const ROW_HEIGHT = 18;
const PAGE_BOTTOM = 780;

const round2 = (n) => Math.round(n * 100) / 100;

const fileName = (extension) => `transactions-${new Date().toISOString().slice(0, 10)}.${extension}`;

const formatDate = (date, format) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const money = (currency, amount) =>
  `${currency} ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Wraps a value for a CSV file, and defuses spreadsheet formulas
const csvCell = (value) => {
  let text = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// Keeps only characters that the PDF's built-in font can draw
const clean = (text) => String(text || '').replace(/[^\x20-\xFF]/g, '?');

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// Finds the transactions to export, using the same filters as the list
const loadTransactions = async (req) => {
  const { filter, error } = buildTransactionFilter(req.user._id, req.query);
  if (error) {
    return { status: 400, message: error };
  }

  const transactions = await Transaction.find(filter)
    .populate('category', 'name')
    .sort({ date: -1, createdAt: -1 })
    .limit(MAX_EXPORT + 1)
    .lean();

  if (transactions.length > MAX_EXPORT) {
    return {
      status: 400,
      message: `Too many entries to export (the limit is ${MAX_EXPORT}). Please narrow your filters.`,
    };
  }

  return { transactions };
};

// Export the filtered transactions as a CSV file
exports.exportCsv = async (req, res) => {
  try {
    const result = await loadTransactions(req);
    if (result.message) {
      return res.status(result.status).json({ message: result.message });
    }

    const header = ['Date', 'Type', 'Category', 'Payment method', 'Amount', 'Description', 'Notes', 'Tags'];

    const rows = result.transactions.map((t) => [
      formatDate(t.date, 'YYYY-MM-DD'),
      t.type === 'income' ? 'Income' : 'Expense',
      t.category ? t.category.name : '',
      t.paymentMethod,
      t.amount,
      t.description,
      t.notes,
      (t.tags || []).join('; '),
    ]);

    const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
    const csv = `\uFEFF${lines.join('\r\n')}\r\n`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName('csv')}"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Draws one row of the table at height y
const drawRow = (doc, y, cells, bold) => {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000000');
  let x = LEFT;
  COLUMNS.forEach((column, index) => {
    doc.text(cells[index], x, y, { width: column.width - 6, align: column.align, lineBreak: false });
    x += column.width;
  });
};

// Draws the column titles with a line under them, and returns the next y
const drawHeader = (doc, y) => {
  drawRow(doc, y, COLUMNS.map((column) => column.label), true);
  doc
    .moveTo(LEFT, y + 14)
    .lineTo(LEFT + TABLE_WIDTH, y + 14)
    .lineWidth(0.5)
    .strokeColor('#999999')
    .stroke();
  return y + ROW_HEIGHT;
};

// Export the filtered transactions as a PDF file
exports.exportPdf = async (req, res) => {
  try {
    const result = await loadTransactions(req);
    if (result.message) {
      return res.status(result.status).json({ message: result.message });
    }

    const { transactions } = result;
    const { name, defaultCurrency, dateFormat } = req.user;

    const total = (type) =>
      round2(transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0));
    const income = total('income');
    const expenses = total('expense');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName('pdf')}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text('Expense Tracker - Transactions', LEFT, 40);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#555555')
      .text(`${clean(name)}  |  Exported ${formatDate(new Date(), dateFormat)}  |  ${transactions.length} entries`);
    doc.moveDown(0.8);
    doc
      .fillColor('#000000')
      .fontSize(11)
      .text(
        `Income: ${money(defaultCurrency, income)}     Expenses: ${money(defaultCurrency, expenses)}     Net: ${money(defaultCurrency, income - expenses)}`
      );

    let y = drawHeader(doc, doc.y + 16);

    if (transactions.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No transactions match these filters.', LEFT, y + 6);
    }

    transactions.forEach((t) => {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        y = drawHeader(doc, 40);
      }

      drawRow(
        doc,
        y,
        [
          formatDate(t.date, dateFormat),
          truncate(clean(t.category ? t.category.name : ''), 16),
          truncate(clean(t.description), 32),
          truncate(clean(t.paymentMethod), 13),
          `${t.type === 'income' ? '+' : '-'} ${money(defaultCurrency, t.amount)}`,
        ],
        false
      );
      y += ROW_HEIGHT;
    });

    doc.end();
  } catch (error) {
    if (res.headersSent) {
      return res.end();
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};