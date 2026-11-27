// AddEntry.jsx
// The form for adding a new expense or income, or for editing an existing one.

import { useState } from 'react';
import { PAYMENT_METHODS, REPEAT_OPTIONS, makeId, todayText } from '../lib.js';

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB, in bytes

// A receipt must be a JPG, PNG or PDF file, and no bigger than 5 MB.
function isValidReceipt(file) {
  const isAllowedType = /\.(jpe?g|png|pdf)$/i.test(file.name);
  return isAllowedType && file.size <= MAX_RECEIPT_SIZE;
}

// The starting values for a brand-new entry.
function newEntryDefaults() {
  return { desc: '', amt: '', cat: '', date: todayText(), pay: 'Card', tags: '', notes: '', rep: 'never' };
}

export default function AddEntry({ data, editingId, entryType, goToPage, changeData }) {
  // When editing, find the entry. Otherwise this form is for a new entry.
  const editing = editingId ? data.tx.find(t => t.id === editingId) : null;
  // The fields start with the saved values when editing, or the defaults for a new entry.
  const start = editing || newEntryDefaults();

  const [type, setType] = useState(editing ? editing.type : entryType);
  const [error, setError] = useState('');
  const isIncome = type === 'i';

  // Runs when the form is saved.
  function handleSave(event) {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form));
    const amount = parseFloat(values.amt);
    const receipt = form.rc.files[0]; // the chosen file, or undefined

    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!values.date) {
      setError('Date is required.');
      return;
    }
    if (!values.cat) {
      setError('Please choose a category.');
      return;
    }
    if (receipt && !isValidReceipt(receipt)) {
      setError('Receipt must be a JPG, PNG or PDF under 5 MB.');
      return;
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    changeData(draft => {
      // When editing, find the saved copy of this entry inside the draft.
      const existing = editing ? draft.tx.find(t => t.id === editing.id) : null;

      // Keep the old receipt name, unless a new receipt was chosen.
      let receiptName = existing && existing.rc ? existing.rc : '';
      if (receipt) receiptName = receipt.name;

      const entry = {
        id: existing ? existing.id : makeId(),
        type: values.type,
        desc: values.desc.trim(),
        amt: roundedAmount,
        cat: values.cat,
        date: values.date,
        pay: values.pay,
        tags: values.tags.trim(),
        notes: values.notes.trim(),
        rep: values.rep,
        last: existing && existing.last ? existing.last : values.date,
        rc: receiptName,
      };

      if (existing) Object.assign(existing, entry);
      else draft.tx.push(entry);
    }, editing ? 'Entry updated' : 'Entry saved');

    goToPage('tx');
  }

  // The heading and button text depend on what we are doing.
  let heading = '➕ Add ' + (isIncome ? 'income' : 'expense');
  if (editing) heading = '✏️ Edit entry';

  let buttonText = 'Save entry';
  if (isIncome) buttonText = 'Save income';
  if (editing) buttonText = 'Save changes';

  return (
    <div className="card">
      <h3>{heading}</h3>
      <form className="grid2" onSubmit={handleSave}>
        <label>Type
          <select name="type" value={type} onChange={e => setType(e.target.value)}>
            <option value="e">Expense</option>
            <option value="i">Income</option>
          </select>
        </label>

        <label>Description
          <input name="desc" required maxLength={60} defaultValue={start.desc} placeholder="e.g. Lunch" />
        </label>

        <label>Amount
          <input name="amt" type="number" step="0.01" min="0.01" required defaultValue={start.amt} />
        </label>

        <label>Category
          <select name="cat" required defaultValue={start.cat}>
            <option value="">Choose</option>
            {data.cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </label>

        <label>Date
          <input name="date" type="date" required defaultValue={start.date} />
        </label>

        <label>Payment method
          <select name="pay" defaultValue={start.pay}>
            {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
          </select>
        </label>

        <label>Tags <span className="opt">Optional</span>
          <input name="tags" defaultValue={start.tags} placeholder="e.g. #work" />
        </label>

        <label>Notes (optional)
          <input name="notes" defaultValue={start.notes} />
        </label>

        <label>Repeat
          <select name="rep" defaultValue={start.rep}>
            {REPEAT_OPTIONS.map(r => (
              <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </label>

        <label>Receipt (JPG, PNG or PDF, max 5 MB)
          <input name="rc" type="file" accept=".jpg,.jpeg,.png,.pdf" />
          {editing && editing.rc && <small>Current: {editing.rc}</small>}
        </label>

        <p className="err grid-full">{error}</p>

        <div className="grid-full row" style={{ justifyContent: 'flex-start' }}>
          <button className="btn">{buttonText}</button>
          {editing && (
            <button type="button" className="btn ghost" onClick={() => goToPage('tx')}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
}
