// Dashboard.jsx
// The first tracker page: this month's totals, budget status, a quick "add expense" form,
// a pie chart of spending, and the five newest entries.

import {
  budgetAlerts, findCategory, formatMoney, makeId, monthLabel,
  monthTotals, newestFirst, todayText, totalBudget,
} from '../lib.js';
import { BudgetSummary, Legend, TransactionRow, askToDelete } from './shared.jsx';

export default function Dashboard({ data, month, goToPage, changeData, showMessage, askQuestion }) {
  const totals = monthTotals(data, month);
  const budget = totalBudget(data, month);
  const alerts = budgetAlerts(data, month);
  const balance = totals.income - totals.expenses;
  const usedPercent = budget ? Math.round(totals.expenses / budget * 100) : 0;

  // One item per category that has spending this month, biggest first.
  const spendingItems = Object.keys(totals.byCategory)
    .map(id => {
      const category = findCategory(data, id);
      return { label: category.name, value: totals.byCategory[id], color: category.color };
    })
    .sort((a, b) => b.value - a.value);

  const recentEntries = [...data.tx].sort(newestFirst).slice(0, 5);

  // Runs when the quick-add form is submitted.
  function handleQuickAdd(event) {
    event.preventDefault();
    // The form's inputs can be read by their name, for example form.amt.
    const form = event.target;
    const description = form.desc.value.trim();
    const amount = parseFloat(form.amt.value);
    const categoryId = form.cat.value;

    const isValid = amount > 0 && categoryId !== '';
    if (!isValid) {
      showMessage('Enter an amount and a category');
      return;
    }

    const today = todayText();
    changeData(draft => {
      draft.tx.push({
        id: makeId(),
        type: 'e',
        desc: description || 'Expense',
        amt: Math.round(amount * 100) / 100, // round to 2 decimal places
        cat: categoryId,
        date: today,
        pay: 'Cash',
        tags: '',
        notes: '',
        rep: 'never',
        last: today,
      });
    }, 'Expense added');
    form.reset();
  }

  return (
    <>
      {alerts.map(item => (
        <div key={item.key} className={`al ${item.isOver ? 'hi' : 'wn'}`}>
          {item.isOver ? 'Budget reached' : 'Heads up'}: {item.category.name} is at {Math.round(item.percent)}% of its monthly budget.
        </div>
      ))}

      <div className="grid3">
        <div className="stat s-ok">
          <div className="ico" style={{ background: 'var(--ok)' }}>👛</div>
          <div>
            <small>Total income</small>
            <b className="t-ok">{formatMoney(data.cur, totals.income)}</b>
          </div>
        </div>
        <div className="stat s-bad">
          <div className="ico" style={{ background: 'var(--bad)' }}>−</div>
          <div>
            <small>Total expenses</small>
            <b className="t-bad">{formatMoney(data.cur, totals.expenses)}</b>
            <small>{budget ? `${usedPercent}% of ${formatMoney(data.cur, budget)} budget` : 'No budget set'}</small>
          </div>
        </div>
        <div className="stat s-br">
          <div className="ico" style={{ background: 'var(--br)' }}>📊</div>
          <div>
            <small>Balance</small>
            <b className="blue">{formatMoney(data.cur, balance)}</b>
            <small>{formatMoney(data.cur, Math.max(0, budget - totals.expenses))} budget left</small>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="row">
            <h3>🎯 Monthly budget · {monthLabel(month)}</h3>
            <span className="lnk" onClick={() => goToPage('bud')}>Manage budgets →</span>
          </div>
          <BudgetSummary currency={data.cur} budget={budget} spent={totals.expenses} />
        </div>
        <div className="card">
          <h3>📊 Expense overview</h3>
          <Legend currency={data.cur} items={spendingItems} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>➕ Quick add expense</h3>
          <form onSubmit={handleQuickAdd}>
            <input name="desc" placeholder="Description (e.g. Lunch)" />
            <input name="amt" type="number" step="0.01" min="0.01" required placeholder="Amount" />
            <select name="cat" required>
              <option value="">Choose category</option>
              {data.cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <button className="btn" style={{ width: '100%' }}>Add expense</button>
          </form>
        </div>

        <div className="card">
          <div className="row">
            <h3>🧾 Recent transactions</h3>
            <span className="lnk" onClick={() => goToPage('tx')}>View all →</span>
          </div>
          {recentEntries.map(entry => (
            <TransactionRow
              key={entry.id}
              data={data}
              entry={entry}
              onDelete={item => askToDelete(askQuestion, changeData, item.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
