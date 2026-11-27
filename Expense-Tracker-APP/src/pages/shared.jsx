// shared.jsx
// Small pieces that more than one page uses.

import { findCategory, formatMoney, formatDate, percentColor } from '../lib.js';

// Asks "are you sure?" before deleting an entry.
export function askToDelete(askQuestion, changeData, entryId) {
  askQuestion({
    title: 'Delete this entry?',
    message: 'This transaction will be permanently removed. This cannot be undone.',
    buttonText: 'Delete entry',
    isDanger: true,
    onConfirm: () => changeData(draft => {
      draft.tx = draft.tx.filter(entry => entry.id !== entryId);
    }, 'Entry deleted'),
  });
}

// Turns an angle into a point on a circle (centre 80,80, radius 80).
function pointOnCircle(angle) {
  return { x: 80 + 80 * Math.cos(angle), y: 80 + 80 * Math.sin(angle) };
}

// A pie chart. `items` is a list of { label, value, color }. `total` is the sum of all values.
export function PieChart({ items, total }) {
  let angle = -Math.PI / 2; // start at the top of the circle

  return (
    <svg className="pie" viewBox="0 0 160 160">
      {items.map(item => {
        const share = item.value / total; // a number from 0 to 1
        if (share >= 1) {
          return <circle key={item.label} cx="80" cy="80" r="80" fill={item.color} />;
        }
        const startPoint = pointOnCircle(angle);
        const endAngle = angle + share * 2 * Math.PI;
        const endPoint = pointOnCircle(endAngle);
        const isLargeSlice = share > 0.5 ? 1 : 0;
        const path = `M80 80 L${startPoint.x} ${startPoint.y} A80 80 0 ${isLargeSlice} 1 ${endPoint.x} ${endPoint.y} Z`;
        angle = endAngle; // the next slice starts where this one ends
        return <path key={item.label} d={path} fill={item.color} />;
      })}
    </svg>
  );
}

// The pie chart with a list beside it: each colour, the amount and the percentage.
export function Legend({ currency, items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <p className="mut">No spending recorded for this period.</p>;

  return (
    <div className="row" style={{ justifyContent: 'flex-start', gap: 24 }}>
      <PieChart items={items} total={total} />
      <div className="legend grow">
        {items.map(item => (
          <div key={item.label}>
            <span><i style={{ background: item.color }} />{item.label}</span>
            <b>{formatMoney(currency, item.value)} · {Math.round(item.value / total * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// The numbers under "Monthly budget": total, spent, remaining, usage and a coloured bar.
export function BudgetSummary({ currency, budget, spent }) {
  const usedPercent = budget ? spent / budget * 100 : 0;
  const color = percentColor(usedPercent);

  return (
    <>
      <div className="kv">
        <div><small>Total budget</small><b>{budget ? formatMoney(currency, budget) : '—'}</b></div>
        <div><small>Spent</small><b className="t-bad">{formatMoney(currency, spent)}</b></div>
        <div><small>Remaining</small><b className="t-ok">{budget ? formatMoney(currency, Math.max(0, budget - spent)) : '—'}</b></div>
        <div><small>Usage</small><b style={{ color }}>{budget ? Math.round(usedPercent) + '%' : '—'}</b></div>
      </div>
      <div className="bar">
        <i style={{ width: `${Math.min(100, usedPercent)}%`, background: color }} />
      </div>
    </>
  );
}

// One line in a list of entries: icon, category, description, amount and date.
// `showDetails` adds the payment method and an Edit button (used on the Transactions page).
export function TransactionRow({ data, entry, showDetails = false, onEdit, onDelete }) {
  const category = findCategory(data, entry.cat);
  const isIncome = entry.type === 'i';

  return (
    <div className="tx">
      <div className="ico" style={{ background: category.color + '22' }}>{category.icon}</div>
      <div className="grow">
        <b>{category.name}</b>{' '}
        <span className={`pill ${isIncome ? 'ok' : 'bad'}`}>{isIncome ? 'Income' : 'Expense'}</span>
        <small>
          {entry.desc}
          {entry.tags && ' · ' + entry.tags}
          {entry.notes && ' · ' + entry.notes}
          {showDetails && ' · ' + entry.pay}
        </small>
      </div>
      <div className="r">
        <b className={isIncome ? 't-ok' : 't-bad'}>{isIncome ? '+' : '-'} {formatMoney(data.cur, entry.amt)}</b>
        <small>{formatDate(data.df, entry.date)}</small>
      </div>
      {showDetails && (
        <button className="btn ghost" style={{ padding: '6px 10px', marginLeft: 8 }} onClick={() => onEdit(entry.id)}>
          Edit
        </button>
      )}
      <button className="icb" onClick={() => onDelete(entry)}>🗑</button>
    </div>
  );
}
