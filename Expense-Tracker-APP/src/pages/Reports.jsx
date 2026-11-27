// Reports.jsx
// Compares a period of months: income, spending, savings, a pie chart, a bar chart,
// and how this period compares with the period before it.

import { findCategory, formatMoney, monthLabel, monthName, monthTotals, monthsBefore } from '../lib.js';
import { Legend } from './shared.jsx';

// The buttons at the top: [number of months, label].
const PERIOD_CHOICES = [[1, 'Month'], [3, '3 months'], [6, '6 months'], [12, '12 months']];

// Adds up income, expenses and spending by category for a list of months.
function sumMonths(data, months) {
  const total = { income: 0, expenses: 0, byCategory: {} };
  months.forEach(m => {
    const totals = monthTotals(data, m);
    total.income += totals.income;
    total.expenses += totals.expenses;
    Object.entries(totals.byCategory).forEach(([categoryId, amount]) => {
      total.byCategory[categoryId] = (total.byCategory[categoryId] || 0) + amount;
    });
  });
  return total;
}

// Shows "up $50 (10%)" or "down $50 (10%)". The text is green when the change is good.
function ChangeText({ currency, now, before, higherIsGood }) {
  const change = now - before;
  const percent = before ? Math.round(Math.abs(change) / before * 100) : 0;
  const isGood = (change >= 0) === higherIsGood;
  const direction = change < 0 ? 'down' : 'up';
  return (
    <b className={isGood ? 't-ok' : 't-bad'}>
      {direction} {formatMoney(currency, Math.abs(change))} ({percent}%)
    </b>
  );
}

// Two bars per month: income in green, expenses in red.
function BarChart({ months }) {
  const biggest = Math.max(1, ...months.map(m => Math.max(m.income, m.expenses)));
  const slot = 600 / months.length; // horizontal space for each month

  return (
    <svg className="chart" viewBox="0 0 600 230">
      {months.map((m, index) => {
        const left = index * slot + slot * 0.18;
        const barWidth = slot * 0.3;
        const incomeHeight = m.income / biggest * 180;
        const expenseHeight = m.expenses / biggest * 180;
        return (
          <g key={index}>
            <rect x={left} y={200 - incomeHeight} width={barWidth} height={incomeHeight} rx="4" style={{ fill: 'var(--ok)' }} />
            <rect x={left + barWidth + 4} y={200 - expenseHeight} width={barWidth} height={expenseHeight} rx="4" style={{ fill: 'var(--bad)' }} />
            <text x={left + barWidth} y="222" textAnchor="middle" style={{ fill: 'var(--mut)', fontSize: 12 }}>{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Reports({ data, month, reportPeriod, setReportPeriod }) {
  // The months in the chosen period, oldest first, ending with the selected month.
  const periodMonths = [];
  for (let back = reportPeriod - 1; back >= 0; back--) {
    periodMonths.push(monthsBefore(month, back));
  }

  // The same number of months, just before the period.
  const previousMonths = [];
  for (let back = reportPeriod * 2 - 1; back >= reportPeriod; back--) {
    previousMonths.push(monthsBefore(month, back));
  }

  const current = sumMonths(data, periodMonths);
  const previous = sumMonths(data, previousMonths);
  const netSavings = current.income - current.expenses;

  const spendingItems = Object.entries(current.byCategory)
    .map(([categoryId, amount]) => {
      const category = findCategory(data, categoryId);
      return { label: category.name, value: amount, color: category.color };
    })
    .sort((a, b) => b.value - a.value);

  const monthBars = periodMonths.map(m => {
    const totals = monthTotals(data, m);
    return { label: monthName(m), income: totals.income, expenses: totals.expenses };
  });

  return (
    <>
      <div className="row" style={{ marginBottom: 16, justifyContent: 'flex-start' }}>
        <b>Period ending {monthLabel(month)}</b>
        <div className="seg" style={{ marginLeft: 12 }}>
          {PERIOD_CHOICES.map(([count, label]) => (
            <button
              key={count}
              className={`chip ${reportPeriod === count ? 'on' : ''}`}
              onClick={() => setReportPeriod(count)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid3">
        <div className="stat s-ok">
          <div className="ico" style={{ background: 'var(--ok)' }}>👛</div>
          <div><small>Income</small><b className="t-ok">{formatMoney(data.cur, current.income)}</b></div>
        </div>
        <div className="stat s-bad">
          <div className="ico" style={{ background: 'var(--bad)' }}>−</div>
          <div><small>Expenses</small><b className="t-bad">{formatMoney(data.cur, current.expenses)}</b></div>
        </div>
        <div className="stat s-br">
          <div className="ico" style={{ background: 'var(--br)' }}>📊</div>
          <div><small>Net savings</small><b className="blue">{formatMoney(data.cur, netSavings)}</b></div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>🥧 Spending by category</h3>
          <Legend currency={data.cur} items={spendingItems} />
        </div>
        <div className="card">
          <h3>📊 Income and spending over time</h3>
          <BarChart months={monthBars} />
          <small>Green is income, red is spending.</small>
        </div>
      </div>

      <div className="card">
        <h3>📅 This period vs previous period</h3>
        <div className="grid2">
          <div>
            <small>Spending</small>
            <b style={{ fontSize: 24 }}>{formatMoney(data.cur, current.expenses)}</b><br />
            <small>
              <ChangeText currency={data.cur} now={current.expenses} before={previous.expenses} higherIsGood={false} />
              {' '}compared with the previous period.
            </small>
          </div>
          <div>
            <small>Income</small>
            <b style={{ fontSize: 24 }}>{formatMoney(data.cur, current.income)}</b><br />
            <small>
              <ChangeText currency={data.cur} now={current.income} before={previous.income} higherIsGood />
              {' '}compared with the previous period.
            </small>
          </div>
        </div>
      </div>
    </>
  );
}
