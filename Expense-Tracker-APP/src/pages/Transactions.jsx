// Transactions.jsx
// Every entry, with filters (search, category, payment, dates, amounts) and CSV export.

import { useState } from 'react';
import { PAYMENT_METHODS, findCategory, newestFirst } from '../lib.js';
import { TransactionRow, askToDelete } from './shared.jsx';

// The filter boxes start empty.
const NO_FILTERS = {
  search: '', category: '', payment: '', fromDate: '', toDate: '', minAmount: '', maxAmount: '',
};

// Returns true if an entry passes every filter the user has set.
function passesFilters(entry, filters) {
  const searchableText = (entry.desc + ' ' + entry.notes + ' ' + entry.tags).toLowerCase();
  if (filters.search && !searchableText.includes(filters.search.toLowerCase())) return false;
  if (filters.category && entry.cat !== filters.category) return false;
  if (filters.payment && entry.pay !== filters.payment) return false;
  if (filters.fromDate && entry.date < filters.fromDate) return false;
  if (filters.toDate && entry.date > filters.toDate) return false;
  if (filters.minAmount !== '' && entry.amt < Number(filters.minAmount)) return false;
  if (filters.maxAmount !== '' && entry.amt > Number(filters.maxAmount)) return false;
  return true;
}

export default function Transactions({ data, goToPage, changeData, askQuestion }) {
  const [filters, setFilters] = useState(NO_FILTERS);

  // Changes one filter, for example changeFilter('search', 'fuel').
  function changeFilter(name, value) {
    setFilters({ ...filters, [name]: value });
  }

  // The entries that pass the filters, newest first.
  const shown = data.tx.filter(entry => passesFilters(entry, filters)).sort(newestFirst);

  // Builds a CSV text (values separated by commas) of the shown entries, and opens it in a pop-up.
  function exportCsv() {
    const quote = value => `"${String(value).replace(/"/g, '""')}"`;
    const header = 'Date,Type,Description,Category,Amount,Payment,Tags,Notes';
    const lines = shown.map(entry => [
      entry.date,
      entry.type === 'i' ? 'Income' : 'Expense',
      entry.desc,
      findCategory(data, entry.cat).name,
      entry.amt,
      entry.pay,
      entry.tags,
      entry.notes,
    ].map(quote).join(','));
    const csv = [header, ...lines].join('\n');

    askQuestion({
      title: 'Export CSV',
      message: 'Downloads are blocked in this preview. Copy the text below into a file named expenses.csv.',
      area: csv,
    });
  }

  return (
    <>
      <div className="card">
        <div className="filters">
          <input placeholder="Search notes or tags" value={filters.search} onChange={e => changeFilter('search', e.target.value)} />
          <select value={filters.category} onChange={e => changeFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {data.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.payment} onChange={e => changeFilter('payment', e.target.value)}>
            <option value="">All payment methods</option>
            {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={filters.fromDate} onChange={e => changeFilter('fromDate', e.target.value)} />
          <input type="date" value={filters.toDate} onChange={e => changeFilter('toDate', e.target.value)} />
          <input type="number" placeholder="Min amount" value={filters.minAmount} onChange={e => changeFilter('minAmount', e.target.value)} />
          <input type="number" placeholder="Max amount" value={filters.maxAmount} onChange={e => changeFilter('maxAmount', e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="card">
        <h3>{shown.length} transactions</h3>
        {shown.map(entry => (
          <TransactionRow
            key={entry.id}
            data={data}
            entry={entry}
            showDetails
            onEdit={id => goToPage('add', id)}
            onDelete={item => askToDelete(askQuestion, changeData, item.id)}
          />
        ))}
        {shown.length === 0 && <p className="mut">No entries match these filters.</p>}
      </div>
    </>
  );
}
