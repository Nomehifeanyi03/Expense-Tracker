// Pure helpers and seed data. No JSX in this file.

export const KEY = 'expense-tracker-v1';
export const DAY = 864e5;
export const PAY = ['Cash', 'Card', 'Bank transfer', 'Mobile money', 'Other'];
export const REP = ['never', 'daily', 'weekly', 'monthly', 'yearly'];
export const COLS = ['#3b82f6', '#f97316', '#ec4899', '#14b8a6', '#eab308', '#8b5cf6', '#ef4444', '#22c55e'];

const DEF = [
  { id: 'food', name: 'Food & Drinks', icon: '🍔', color: '#3b82f6' },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#f97316' },
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#14b8a6' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#eab308' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { id: 'health', name: 'Health', icon: '💊', color: '#ef4444' },
  { id: 'other', name: 'Other', icon: '📦', color: '#94a3b8' },
];

// [type, description, amount, category, date, payment, tags?, repeat?]
const SEED = [
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

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toLocaleDateString('en-CA');

export function newData(demo) {
  const d = {
    cur: 'USD', df: 'mdy', theme: 'system', emailAlerts: true, weekly: true,
    roll: false, total: 0, cats: DEF.map(c => ({ ...c })), budgets: {}, tx: [], seen: [],
  };
  if (demo) {
    d.total = 1000;
    d.cats.push({ id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', custom: 1 });
    Object.assign(d.budgets, { food: 400, transport: 200, shopping: 150, utilities: 100, entertainment: 100, health: 100 });
    d.tx = SEED.map((r, i) => ({
      id: 's' + i, type: r[0], desc: r[1], amt: r[2], cat: r[3], date: r[4],
      pay: r[5], tags: r[6] || '', notes: '', rep: r[7] || 'never', last: r[4],
    }));
  }
  return d;
}

export function addP(iso, r) {
  const d = new Date(iso + 'T12:00');
  if (r === 'daily') d.setDate(d.getDate() + 1);
  else if (r === 'weekly') d.setDate(d.getDate() + 7);
  else if (r === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (r === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-CA');
}

// Creates copies of recurring entries for every period that has passed.
export function runRecurring(d) {
  const t = today();
  d.tx.filter(x => x.rep && x.rep !== 'never').forEach(x => {
    let n = addP(x.last || x.date, x.rep), k = 0;
    while (n <= t && k++ < 400) {
      d.tx.push({ id: uid(), type: x.type, desc: x.desc, amt: x.amt, cat: x.cat, date: n, pay: x.pay, tags: x.tags, notes: 'Recurring', rep: 'never', last: n });
      x.last = n;
      n = addP(n, x.rep);
    }
  });
}

export const cat = (d, id) => d.cats.find(c => c.id == id) || d.cats.find(c => c.id == 'other') || d.cats[0];
export const money = (cur, n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);

export function fdate(df, iso) {
  const [y, m, d] = iso.split('-');
  if (df === 'dmy') return `${d}/${m}/${y}`;
  if (df === 'iso') return iso;
  return new Date(iso + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const mName = m => new Date(m + '-15T12:00').toLocaleDateString('en-US', { month: 'short' });
export const mLabel = m => `${mName(m)} ${m.slice(0, 4)}`;

export function prevM(m, k) {
  const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 - k, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const byDate = (a, b) => b.date.localeCompare(a.date);
export const stc = p => (p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--ok)');

export function sums(d, m) {
  const r = { inc: 0, exp: 0, byCat: {} };
  d.tx.forEach(t => {
    if (t.date.slice(0, 7) !== m) return;
    if (t.type === 'i') r.inc += t.amt;
    else { r.exp += t.amt; r.byCat[t.cat] = (r.byCat[t.cat] || 0) + t.amt; }
  });
  return r;
}

export function budTot(d, m) {
  if (!d.total) return 0;
  return d.total + (d.roll ? Math.max(0, d.total - sums(d, prevM(m, 1)).exp) : 0);
}

export function alerts(d, m) {
  const s = sums(d, m), out = [];
  d.cats.forEach(c => {
    const b = d.budgets[c.id];
    if (!b) return;
    const sp = s.byCat[c.id] || 0, p = sp / b * 100;
    if (p >= 80) out.push({ k: (p >= 100 ? 'b1' : 'b8') + c.id + m, hi: p >= 100, c, sp, b, p });
  });
  return out.sort((a, b) => b.p - a.p);
}

export function notes(d, m) {
  const n = alerts(d, m).map(a => ({
    k: a.k, ic: a.hi ? '🔴' : '🟠', t: a.hi ? 'Budget reached' : 'Budget warning',
    x: `${a.c.name} has ${a.hi ? 'used' : 'reached'} ${Math.round(a.p)}% of its ${mLabel(m)} budget${a.hi ? ` (${money(d.cur, a.sp)} of ${money(d.cur, a.b)})` : '.'}`,
  }));
  const wk = new Date(Date.now() - 7 * DAY).toLocaleDateString('en-CA');
  const spent = d.tx.filter(t => t.type === 'e' && t.date >= wk).reduce((s, t) => s + t.amt, 0);
  n.push({ k: 'wk' + today(), ic: '✉️', t: 'Weekly summary ready', x: `You spent ${money(d.cur, spent)} in the last 7 days.` });
  d.tx.filter(t => t.rep && t.rep !== 'never').forEach(t => n.push({
    k: 'r' + t.id, ic: '📅', t: 'Recurring entry scheduled',
    x: `${t.desc} repeats ${t.rep}. Next entry on ${fdate(d.df, addP(t.last || t.date, t.rep))}.`,
  }));
  return n;
}

export const unread = (d, m) => notes(d, m).filter(x => !d.seen.includes(x.k)).length;
