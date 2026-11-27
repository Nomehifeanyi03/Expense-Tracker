// Categories.jsx
// Lists all categories. The user can add, rename and delete their own (custom) categories.

import { useState } from 'react';
import { CHART_COLORS, findCategory, formatMoney, makeId, monthTotals } from '../lib.js';

export default function Categories({ data, month, changeData, showMessage, askQuestion }) {
  const totals = monthTotals(data, month);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CHART_COLORS[0]);

  // How many entries each category has this month.
  const entryCounts = {};
  data.tx.forEach(entry => {
    if (entry.date.slice(0, 7) !== month) return;
    entryCounts[entry.cat] = (entryCounts[entry.cat] || 0) + 1;
  });

  function handleAdd(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const alreadyExists = data.cats.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      showMessage('That category already exists');
      return;
    }

    changeData(draft => {
      draft.cats.push({ id: makeId(), name, icon: '🏷️', color: newColor, custom: 1 });
    }, 'Category added');
    setNewName('');
  }

  // Pop-up with a text box to type the new name.
  function askRename(category) {
    askQuestion({
      title: 'Rename category',
      message: '',
      buttonText: 'Save',
      isDanger: false,
      input: category.name,
      onConfirm: typedName => {
        const name = (typedName || '').trim();
        if (!name) return false; // keep the box open
        changeData(draft => {
          findCategory(draft, category.id).name = name;
        }, 'Category renamed');
      },
    });
  }

  function askDelete(category) {
    askQuestion({
      title: 'Delete category?',
      message: 'Its entries will move to Other, and its budget will be removed.',
      buttonText: 'Delete category',
      isDanger: true,
      onConfirm: () => changeData(draft => {
        draft.tx.forEach(entry => {
          if (entry.cat === category.id) entry.cat = 'other';
        });
        delete draft.budgets[category.id];
        draft.cats = draft.cats.filter(c => c.id !== category.id);
      }, 'Category deleted'),
    });
  }

  return (
    <div className="grid2">
      <div className="card">
        <h3>🗂️ Your categories</h3>
        {data.cats.map(category => {
          const count = entryCounts[category.id] || 0;
          const spent = totals.byCategory[category.id] || 0;
          return (
            <div className="tx" key={category.id}>
              <div className="ico" style={{ background: category.color + '22' }}>{category.icon}</div>
              <div className="grow">
                <b>{category.name}</b>{' '}
                <span className={`pill ${category.custom ? '' : 'ok'}`}>{category.custom ? 'Custom' : 'Default'}</span>
                <small>{count} transactions · {formatMoney(data.cur, spent)} this month</small>
              </div>
              {category.custom ? (
                <>
                  <span className="lnk" onClick={() => askRename(category)}>Rename</span>
                  <button className="icb" onClick={() => askDelete(category)}>🗑</button>
                </>
              ) : (
                <small className="mut" style={{ marginLeft: 8 }}>Locked</small>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>➕ New category</h3>
        <form onSubmit={handleAdd}>
          <input
            required
            maxLength={24}
            placeholder="Category name (e.g. Gifts)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <p className="mut" style={{ margin: '6px 0' }}>Colour</p>
          <div className="sw">
            {CHART_COLORS.map(color => (
              <label key={color}>
                <input
                  type="radio"
                  name="col"
                  value={color}
                  checked={newColor === color}
                  onChange={() => setNewColor(color)}
                  hidden
                />
                <i style={{ background: color }} />
              </label>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 14 }}>Add category</button>
        </form>
        <p className="mut" style={{ marginTop: 14 }}>
          Default categories are locked. Deleting a custom category moves its transactions to Other.
        </p>
      </div>
    </div>
  );
}
