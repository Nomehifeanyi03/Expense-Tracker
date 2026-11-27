// Budgets.jsx
// Sets the overall monthly budget, and a budget for each category.

import { formatMoney, monthLabel, monthTotals, percentColor, totalBudget } from '../lib.js';
import { BudgetSummary } from './shared.jsx';

export default function Budgets({ data, month, changeData }) {
  const totals = monthTotals(data, month);
  const budget = totalBudget(data, month);

  function setOverallBudget(event) {
    const amount = Number(event.target.value) || 0;
    changeData(draft => { draft.total = amount; });
  }

  function setRollOver(event) {
    const turnedOn = event.target.checked;
    changeData(draft => { draft.roll = turnedOn; });
  }

  // An empty or zero budget removes the budget for that category.
  function setCategoryBudget(categoryId, text) {
    const amount = Number(text);
    changeData(draft => {
      if (amount > 0) draft.budgets[categoryId] = amount;
      else delete draft.budgets[categoryId];
    });
  }

  return (
    <>
      <div className="card">
        <h3>🎯 Monthly budget · {monthLabel(month)}</h3>
        <div className="grid2" style={{ alignItems: 'end' }}>
          <label>Overall monthly budget
            <input type="number" min="0" value={data.total || ''} placeholder="Set budget" onChange={setOverallBudget} />
          </label>
          <label className="chk">
            <input type="checkbox" checked={data.roll} onChange={setRollOver} />
            {' '}Roll unused budget over to next month <span className="opt">Optional</span>
          </label>
        </div>
        <BudgetSummary currency={data.cur} budget={budget} spent={totals.expenses} />
      </div>

      <div className="grid3">
        {data.cats.map(category => {
          const categoryBudget = data.budgets[category.id];
          const spent = totals.byCategory[category.id] || 0;
          const usedPercent = categoryBudget ? spent / categoryBudget * 100 : 0;
          const color = percentColor(usedPercent);

          return (
            <div className="card" key={category.id}>
              <div className="row">
                <b>{category.icon} {category.name}</b>
                <b style={{ color }}>{categoryBudget ? Math.round(usedPercent) + '%' : 'No budget'}</b>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.min(100, usedPercent)}%`, background: color }} />
              </div>
              <div className="row">
                <small>Spent {formatMoney(data.cur, spent)}</small>
                <small>Remaining {categoryBudget ? formatMoney(data.cur, Math.max(0, categoryBudget - spent)) : '–'}</small>
              </div>
              <input
                type="number"
                min="0"
                placeholder="Set budget"
                value={categoryBudget || ''}
                style={{ marginTop: 10 }}
                onChange={e => setCategoryBudget(category.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
