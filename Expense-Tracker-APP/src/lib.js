// lib.js
// The rules of the app and some helper functions.
// Nothing in this file draws on the screen.
//
// SAVED DATA FOR ONE USER (the "data" that the pages work with):
//   cur        currency code, for example "USD"
//   df         date format: "mdy", "dmy" or "iso"
//   theme      "system", "light" or "dark"
//   emailAlerts, weekly    on/off settings
//   roll       true = unused budget carries over to the next month
//   total      overall monthly budget
//   cats       list of categories: { id, name, icon, color, custom }
//   budgets    category id -> monthly budget amount
//   tx         list of entries (expenses and income)
//   seen       keys of the notifications the user has already read
//
// ONE ENTRY (one item inside tx):
//   id, type ('e' = expense, 'i' = income), desc, amt, cat, date ('YYYY-MM-DD'),
//   pay, tags, notes, rep (never / daily / weekly / monthly / yearly), last, rc (receipt file name)

// The name used to save the data in the browser.
export const STORAGE_KEY = 'expense-tracker-v1';

// One day, in milliseconds.
export const DAY = 24 * 60 * 60 * 1000;

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'Mobile money', 'Other'];
export const REPEAT_OPTIONS = ['never', 'daily', 'weekly', 'monthly', 'yearly'];
export const CHART_COLORS = ['#3b82f6', '#f97316', '#ec4899', '#14b8a6', '#eab308', '#8b5cf6', '#ef4444', '#22c55e'];

// The categories every new account starts with.
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', icon: '🍔', color: '#3b82f6' },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#f97316' },
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#14b8a6' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#eab308' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { id: 'health', name: 'Health', icon: '💊', color: '#ef4444' },
  { id: 'other', name: 'Other', icon: '📦', color: '#94a3b8' },
];

// Sample entries for the "Load sample data" option.
// Each row: [type, description, amount, category, date, payment, tags (optional), repeat (optional)]
const SAMPLE_ENTRIES = [
  ['i', 'Salary', 1500, 'other', '2026-06-01', 'Bank transfer', '', 'monthly'],
  ['e', 'Burger', 25, 'food', '2026-11-08', 'Card'],
  ['e', 'Shoes', 120, 'shopping', '2026-11-07', 'Card'],
  ['e', 'Uber Ride', 15, 'transport', '2026-11-07', 'Card', '#work'],
  ['e', 'Dinner out', 100, 'food', '2026-11-06', 'Card'],
  ['e', 'Pharmacy', 60, 'health', '2026-11-05', 'Cash'],
  ['e', 'Fuel', 150, 'transport', '2026-11-04', 'Card'],
  ['e', 'Groceries', 280, 'food', '2026-11-03', 'Cash'],
  ['e', 'Movie night', 40, 'entertainment', '2026-11-02', 'Card'],
  ['e', 'Internet', 70, 'utilities', '2026-11-02', 'Bank transfer', '', 'monthly'],
  ['e', 'Clothes', 100, 'shopping', '2026-10-15', 'Card'],
  ['e', 'Bills', 70, 'utilities', '2026-10-18', 'Bank transfer'],
  ['e', 'Groceries', 320, 'food', '2026-10-10', 'Card'],
  ['e', 'Fuel', 158, 'transport', '2026-10-12', 'Card'],
  ['e', 'Groceries', 340, 'food', '2026-09-10', 'Card'],
  ['e', 'Fuel', 166, 'transport', '2026-09-12', 'Card'],
  ['e', 'Clothes', 110, 'shopping', '2026-09-15', 'Card'],
  ['e', 'Bills', 70, 'utilities', '2026-09-18', 'Bank transfer'],
];

// Makes a random id for a new entry, for example "k3j9x2ab".
export function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// Today's date as text, for example "2026-11-24".
export function todayText() {
  return new Date().toLocaleDateString('en-CA');
}

// Creates the data for a new account. If withSample is true, it includes sample entries.
export function makeNewData(withSample) {
  const data = {
    cur: 'NGN', // new accounts start in naira
    df: 'mdy',
    theme: 'system',
    emailAlerts: true,
    weekly: true,
    roll: false,
    total: 0,
    cats: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    budgets: {},
    tx: [],
    seen: [],
  };

  if (withSample) {
    data.total = 1000;
    data.cats.push({ id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', custom: 1 });
    Object.assign(data.budgets, {
      food: 400, transport: 200, shopping: 150, utilities: 100, entertainment: 100, health: 100,
    });
    data.tx = SAMPLE_ENTRIES.map((row, index) => ({
      id: 's' + index,
      type: row[0],
      desc: row[1],
      amt: row[2],
      cat: row[3],
      date: row[4],
      pay: row[5],
      tags: row[6] || '',
      notes: '',
      rep: row[7] || 'never',
      last: row[4],
    }));
  }
  return data;
}

// Moves a date forward by one repeat period.
// For example, addPeriod('2026-11-02', 'monthly') returns '2026-12-02'.
export function addPeriod(dateText, repeat) {
  const date = new Date(dateText + 'T12:00'); // midday avoids time-zone surprises
  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  else if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  else if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return date.toLocaleDateString('en-CA');
}

// Adds a copy of each repeating entry for every period that has already passed.
export function runRecurring(data) {
  const todayDate = todayText();
  // Make a separate list first, because we add new entries while we loop.
  const repeating = data.tx.filter(entry => entry.rep && entry.rep !== 'never');

  repeating.forEach(template => {
    let nextDate = addPeriod(template.last || template.date, template.rep);
    let safety = 0; // stops the loop if something goes wrong
    while (nextDate <= todayDate && safety < 400) {
      safety++;
      data.tx.push({
        id: makeId(),
        type: template.type,
        desc: template.desc,
        amt: template.amt,
        cat: template.cat,
        date: nextDate,
        pay: template.pay,
        tags: template.tags,
        notes: 'Recurring',
        rep: 'never',
        last: nextDate,
      });
      template.last = nextDate;
      nextDate = addPeriod(nextDate, template.rep);
    }
  });
}

// Finds a category by its id. If it is missing, returns "Other" (or the first category).
export function findCategory(data, id) {
  return data.cats.find(c => c.id === id) || data.cats.find(c => c.id === 'other') || data.cats[0];
}

// Shows an amount with its currency, for example "$1,500.00".
export function formatMoney(currency, amount) {
  // The en-NG locale writes naira with its sign, ₦1,500.00. Other currencies use en-US.
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

// Shows a date in the user's chosen format.
export function formatDate(format, isoDate) {
  const [year, month, day] = isoDate.split('-');
  if (format === 'dmy') return `${day}/${month}/${year}`;
  if (format === 'iso') return isoDate;
  return new Date(isoDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Short month name, for example "Nov". Input looks like "2026-11".
export function monthName(month) {
  return new Date(month + '-15T12:00').toLocaleDateString('en-US', { month: 'short' });
}

// Month with its year, for example "Nov 2026".
export function monthLabel(month) {
  return `${monthName(month)} ${month.slice(0, 4)}`;
}

// The month that is `count` months before `month`. Input and output look like "2026-11".
export function monthsBefore(month, count) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 - count, 15);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// The colour for a percentage: green under 80%, orange from 80% to 99%, red from 100%.
export function percentColor(percent) {
  if (percent >= 100) return 'var(--bad)';
  if (percent >= 80) return 'var(--warn)';
  return 'var(--ok)';
}

// Sorting helper: newest entries first.
export function newestFirst(a, b) {
  return b.date.localeCompare(a.date);
}

// Adds up one month: total income, total expenses, and expenses for each category.
export function monthTotals(data, month) {
  const totals = { income: 0, expenses: 0, byCategory: {} };
  data.tx.forEach(entry => {
    if (entry.date.slice(0, 7) !== month) return; // a different month, so skip it
    if (entry.type === 'i') {
      totals.income += entry.amt;
      return;
    }
    totals.expenses += entry.amt;
    totals.byCategory[entry.cat] = (totals.byCategory[entry.cat] || 0) + entry.amt;
  });
  return totals;
}

// The overall budget for a month. If "roll over" is on, unused money from last month is added.
export function totalBudget(data, month) {
  if (!data.total) return 0;
  let rolledOver = 0;
  if (data.roll) {
    const lastMonthSpent = monthTotals(data, monthsBefore(month, 1)).expenses;
    rolledOver = Math.max(0, data.total - lastMonthSpent);
  }
  return data.total + rolledOver;
}

// Budget warnings: categories that have reached 80% (warning) or 100% (budget reached).
// The highest percentage comes first.
export function budgetAlerts(data, month) {
  const totals = monthTotals(data, month);
  const alerts = [];
  data.cats.forEach(category => {
    const budget = data.budgets[category.id];
    if (!budget) return; // no budget set for this category
    const spent = totals.byCategory[category.id] || 0;
    const percent = spent / budget * 100;
    if (percent < 80) return;
    alerts.push({
      key: (percent >= 100 ? 'b1' : 'b8') + category.id + month,
      isOver: percent >= 100,
      category,
      spent,
      budget,
      percent,
    });
  });
  return alerts.sort((a, b) => b.percent - a.percent);
}

// All notifications for a month: budget warnings, the weekly summary, and recurring reminders.
export function notifications(data, month) {
  const list = budgetAlerts(data, month).map(alert => {
    const detail = alert.isOver
      ? ` (${formatMoney(data.cur, alert.spent)} of ${formatMoney(data.cur, alert.budget)})`
      : '.';
    return {
      key: alert.key,
      icon: alert.isOver ? '🔴' : '🟠',
      title: alert.isOver ? 'Budget reached' : 'Budget warning',
      text: `${alert.category.name} has ${alert.isOver ? 'used' : 'reached'} ${Math.round(alert.percent)}% of its ${monthLabel(month)} budget${detail}`,
    };
  });

  // Weekly summary: how much was spent in the last 7 days.
  const weekAgo = new Date(Date.now() - 7 * DAY).toLocaleDateString('en-CA');
  const spentThisWeek = data.tx
    .filter(entry => entry.type === 'e' && entry.date >= weekAgo)
    .reduce((sum, entry) => sum + entry.amt, 0);
  list.push({
    key: 'wk' + todayText(),
    icon: '✉️',
    title: 'Weekly summary ready',
    text: `You spent ${formatMoney(data.cur, spentThisWeek)} in the last 7 days.`,
  });

  // One reminder for each repeating entry, showing when its next copy is due.
  data.tx
    .filter(entry => entry.rep && entry.rep !== 'never')
    .forEach(entry => {
      const nextDate = addPeriod(entry.last || entry.date, entry.rep);
      list.push({
        key: 'r' + entry.id,
        icon: '📅',
        title: 'Recurring entry scheduled',
        text: `${entry.desc} repeats ${entry.rep}. Next entry on ${formatDate(data.df, nextDate)}.`,
      });
    });

  return list;
}

// How many notifications have not been read yet.
export function unreadCount(data, month) {
  return notifications(data, month).filter(n => !data.seen.includes(n.key)).length;
}
