import { useState } from 'react';
import { PAY, REP, COLS, today, uid, cat, money, fdate, mLabel, mName, prevM, byDate, stc, sums, budTot, alerts, notes } from './lib.js';

const confirmDelete = (ask, mut, id) =>
  ask('Delete this entry?', 'This transaction will be permanently removed. This cannot be undone.', 'Delete entry', true,
    () => mut(x => { x.tx = x.tx.filter(t => t.id !== id); }, 'Entry deleted'));

export function Pie({ items, t }) {
  let a = -Math.PI / 2;
  return (
    <svg className="pie" viewBox="0 0 160 160">
      {items.map(i => {
        const f = i.v / t;
        if (f >= 1) return <circle key={i.l} cx="80" cy="80" r="80" fill={i.c} />;
        const b = a + f * 2 * Math.PI;
        const p = [a, b].map(x => [80 + 80 * Math.cos(x), 80 + 80 * Math.sin(x)]);
        a = b;
        return <path key={i.l} d={`M80 80L${p[0][0]} ${p[0][1]}A80 80 0 ${f > 0.5 ? 1 : 0} 1 ${p[1][0]} ${p[1][1]}Z`} fill={i.c} />;
      })}
    </svg>
  );
}

export function Legend({ cur, items }) {
  const t = items.reduce((s, i) => s + i.v, 0);
  if (!t) return <p className="mut">No spending recorded for this period.</p>;
  return (
    <div className="row" style={{ justifyContent: 'flex-start', gap: 24 }}>
      <Pie items={items} t={t} />
      <div className="legend grow">
        {items.map(i => (
          <div key={i.l}>
            <span><i style={{ background: i.c }} />{i.l}</span>
            <b>{money(cur, i.v)} · {Math.round(i.v / t * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetKV({ d, tot, sp }) {
  const p = tot ? sp / tot * 100 : 0;
  return (
    <>
      <div className="kv">
        <div><small>Total budget</small><b>{tot ? money(d.cur, tot) : '—'}</b></div>
        <div><small>Spent</small><b className="t-bad">{money(d.cur, sp)}</b></div>
        <div><small>Remaining</small><b className="t-ok">{tot ? money(d.cur, Math.max(0, tot - sp)) : '—'}</b></div>
        <div><small>Usage</small><b style={{ color: stc(p) }}>{tot ? Math.round(p) + '%' : '—'}</b></div>
      </div>
      <div className="bar"><i style={{ width: `${Math.min(100, p)}%`, background: stc(p) }} /></div>
    </>
  );
}

function Bars({ s }) {
  const mx = Math.max(1, ...s.map(m => Math.max(m.inc, m.exp))), w = 600 / s.length;
  return (
    <svg className="chart" viewBox="0 0 600 230">
      {s.map((m, k) => {
        const x = k * w + w * 0.18, bw = w * 0.3, hi = m.inc / mx * 180, he = m.exp / mx * 180;
        return (
          <g key={k}>
            <rect x={x} y={200 - hi} width={bw} height={hi} rx="4" style={{ fill: 'var(--ok)' }} />
            <rect x={x + bw + 4} y={200 - he} width={bw} height={he} rx="4" style={{ fill: 'var(--bad)' }} />
            <text x={x + bw} y="222" textAnchor="middle" style={{ fill: 'var(--mut)', fontSize: 12 }}>{m.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Row({ d, t, full, onEdit, onDel }) {
  const c = cat(d, t.cat), inc = t.type === 'i';
  return (
    <div className="tx">
      <div className="ico" style={{ background: c.color + '22' }}>{c.icon}</div>
      <div className="grow">
        <b>{c.name}</b> <span className={`pill ${inc ? 'ok' : 'bad'}`}>{inc ? 'Income' : 'Expense'}</span>
        <small>{t.desc}{t.tags && ' · ' + t.tags}{t.notes && ' · ' + t.notes}{full && ' · ' + t.pay}</small>
      </div>
      <div className="r">
        <b className={inc ? 't-ok' : 't-bad'}>{inc ? '+' : '-'} {money(d.cur, t.amt)}</b>
        <small>{fdate(d.df, t.date)}</small>
      </div>
      {full && <button className="btn ghost" style={{ padding: '6px 10px', marginLeft: 8 }} onClick={() => onEdit(t.id)}>Edit</button>}
      <button className="icb" onClick={() => onDel(t)}>🗑</button>
    </div>
  );
}

export function Dashboard({ d, mon, go, mut, flash, ask }) {
  const s = sums(d, mon), tot = budTot(d, mon), al = alerts(d, mon);
  const bal = s.inc - s.exp, pct = tot ? Math.round(s.exp / tot * 100) : 0;
  const items = Object.keys(s.byCat).map(id => ({ v: s.byCat[id], c: cat(d, id).color, l: cat(d, id).name })).sort((a, b) => b.v - a.v);

  const quickAdd = e => {
    e.preventDefault();
    const f = e.target, desc = f.desc.value.trim(), amt = parseFloat(f.amt.value), c = f.cat.value, day = today();
    if (!(amt > 0) || !c) return flash('Enter an amount and a category');
    mut(x => { x.tx.push({ id: uid(), type: 'e', desc: desc || 'Expense', amt: Math.round(amt * 100) / 100, cat: c, date: day, pay: 'Cash', tags: '', notes: '', rep: 'never', last: day }); }, 'Expense added');
    f.reset();
  };

  return (
    <>
      {al.map(a => (
        <div key={a.k} className={`al ${a.hi ? 'hi' : 'wn'}`}>
          {a.hi ? 'Budget reached' : 'Heads up'}: {a.c.name} is at {Math.round(a.p)}% of its monthly budget.
        </div>
      ))}
      <div className="grid3">
        <div className="stat s-ok"><div className="ico" style={{ background: 'var(--ok)' }}>👛</div><div><small>Total income</small><b className="t-ok">{money(d.cur, s.inc)}</b></div></div>
        <div className="stat s-bad"><div className="ico" style={{ background: 'var(--bad)' }}>−</div><div><small>Total expenses</small><b className="t-bad">{money(d.cur, s.exp)}</b><small>{tot ? `${pct}% of ${money(d.cur, tot)} budget` : 'No budget set'}</small></div></div>
        <div className="stat s-br"><div className="ico" style={{ background: 'var(--br)' }}>📊</div><div><small>Balance</small><b className="blue">{money(d.cur, bal)}</b><small>{money(d.cur, Math.max(0, tot - s.exp))} budget left</small></div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="row"><h3>🎯 Monthly budget · {mLabel(mon)}</h3><span className="lnk" onClick={() => go('bud')}>Manage budgets →</span></div>
          <BudgetKV d={d} tot={tot} sp={s.exp} />
        </div>
        <div className="card"><h3>📊 Expense overview</h3><Legend cur={d.cur} items={items} /></div>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>➕ Quick add expense</h3>
          <form onSubmit={quickAdd}>
            <input name="desc" placeholder="Description (e.g. Lunch)" />
            <input name="amt" type="number" step="0.01" min="0.01" required placeholder="Amount" />
            <select name="cat" required>
              <option value="">Choose category</option>
              {d.cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <button className="btn" style={{ width: '100%' }}>Add expense</button>
          </form>
        </div>
        <div className="card">
          <div className="row"><h3>🧾 Recent transactions</h3><span className="lnk" onClick={() => go('tx')}>View all →</span></div>
          {[...d.tx].sort(byDate).slice(0, 5).map(t => <Row key={t.id} d={d} t={t} onEdit={() => {}} onDel={x => confirmDelete(ask, mut, x.id)} />)}
        </div>
      </div>
    </>
  );
}

export function Transactions({ d, go, mut, ask }) {
  const [F, setF] = useState({ q: '', c: '', p: '', from: '', to: '', min: '', max: '' });
  const up = k => e => setF({ ...F, [k]: e.target.value });
  const rows = d.tx.filter(x =>
    (!F.q || (x.desc + ' ' + x.notes + ' ' + x.tags).toLowerCase().includes(F.q.toLowerCase())) &&
    (!F.c || x.cat == F.c) && (!F.p || x.pay == F.p) &&
    (!F.from || x.date >= F.from) && (!F.to || x.date <= F.to) &&
    (F.min === '' || x.amt >= +F.min) && (F.max === '' || x.amt <= +F.max)
  ).sort(byDate);

  const exportCsv = () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = ['Date,Type,Description,Category,Amount,Payment,Tags,Notes',
      ...rows.map(x => [x.date, x.type === 'i' ? 'Income' : 'Expense', x.desc, cat(d, x.cat).name, x.amt, x.pay, x.tags, x.notes].map(q).join(','))].join('\n');
    ask('Export CSV', 'Downloads are blocked in this preview. Copy the text below into a file named expenses.csv.', null, false, null, { area: csv });
  };

  return (
    <>
      <div className="card">
        <div className="filters">
          <input placeholder="Search notes or tags" value={F.q} onChange={up('q')} />
          <select value={F.c} onChange={up('c')}>
            <option value="">All categories</option>
            {d.cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={F.p} onChange={up('p')}>
            <option value="">All payment methods</option>
            {PAY.map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={F.from} onChange={up('from')} />
          <input type="date" value={F.to} onChange={up('to')} />
          <input type="number" placeholder="Min amount" value={F.min} onChange={up('min')} />
          <input type="number" placeholder="Max amount" value={F.max} onChange={up('max')} />
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="card">
        <h3>{rows.length} transactions</h3>
        {rows.map(t => <Row key={t.id} d={d} t={t} full onEdit={id => go('add', id)} onDel={x => confirmDelete(ask, mut, x.id)} />)}
        {!rows.length && <p className="mut">No entries match these filters.</p>}
      </div>
    </>
  );
}

export function EntryForm({ d, editId, ftype, go, mut }) {
  const x = editId ? d.tx.find(t => t.id === editId) : null;
  const [type, setType] = useState(x ? x.type : ftype);
  const [err, setErr] = useState('');
  const isI = type === 'i';

  const save = e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f)), a = parseFloat(v.amt), rc = f.rc.files[0];
    if (!(a > 0)) return setErr('Amount must be greater than 0.');
    if (!v.date) return setErr('Date is required.');
    if (!v.cat) return setErr('Please choose a category.');
    if (rc && (rc.size > 5242880 || !/\.(jpe?g|png|pdf)$/i.test(rc.name))) return setErr('Receipt must be a JPG, PNG or PDF under 5 MB.');
    mut(data => {
      const old = x && data.tx.find(t => t.id === x.id);
      const t = {
        id: old ? old.id : uid(), type: v.type, desc: v.desc.trim(), amt: Math.round(a * 100) / 100,
        cat: v.cat, date: v.date, pay: v.pay, tags: v.tags.trim(), notes: v.notes.trim(), rep: v.rep,
        last: old?.last || v.date, rc: rc ? rc.name : old?.rc || '',
      };
      if (old) Object.assign(old, t); else data.tx.push(t);
    }, x ? 'Entry updated' : 'Entry saved');
    go('tx');
  };

  return (
    <div className="card">
      <h3>{x ? '✏️ Edit entry' : '➕ Add ' + (isI ? 'income' : 'expense')}</h3>
      <form className="grid2" onSubmit={save}>
        <label>Type
          <select name="type" value={type} onChange={e => setType(e.target.value)}>
            <option value="e">Expense</option>
            <option value="i">Income</option>
          </select>
        </label>
        <label>Description<input name="desc" required maxLength={60} defaultValue={x?.desc ?? ''} placeholder="e.g. Lunch" /></label>
        <label>Amount<input name="amt" type="number" step="0.01" min="0.01" required defaultValue={x?.amt ?? ''} /></label>
        <label>Category
          <select name="cat" required defaultValue={x?.cat ?? ''}>
            <option value="">Choose</option>
            {d.cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </label>
        <label>Date<input name="date" type="date" required defaultValue={x?.date ?? today()} /></label>
        <label>Payment method
          <select name="pay" defaultValue={x?.pay ?? 'Card'}>{PAY.map(p => <option key={p}>{p}</option>)}</select>
        </label>
        <label>Tags <span className="opt">Optional</span><input name="tags" defaultValue={x?.tags ?? ''} placeholder="e.g. #work" /></label>
        <label>Notes (optional)<input name="notes" defaultValue={x?.notes ?? ''} /></label>
        <label>Repeat
          <select name="rep" defaultValue={x?.rep ?? 'never'}>
            {REP.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
        </label>
        <label>Receipt (JPG, PNG or PDF, max 5 MB)
          <input name="rc" type="file" accept=".jpg,.jpeg,.png,.pdf" />
          {x?.rc && <small>Current: {x.rc}</small>}
        </label>
        <p className="err grid-full">{err}</p>
        <div className="grid-full row" style={{ justifyContent: 'flex-start' }}>
          <button className="btn">{x ? 'Save changes' : isI ? 'Save income' : 'Save entry'}</button>
          {x && <button type="button" className="btn ghost" onClick={() => go('tx')}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

export function Budgets({ d, mon, mut }) {
  const s = sums(d, mon), tot = budTot(d, mon);
  const setTotal = e => { const v = +e.target.value || 0; mut(x => { x.total = v; }); };
  const setRoll = e => { const v = e.target.checked; mut(x => { x.roll = v; }); };
  const setBud = (id, raw) => { const v = +raw; mut(x => { if (v > 0) x.budgets[id] = v; else delete x.budgets[id]; }); };

  return (
    <>
      <div className="card">
        <h3>🎯 Monthly budget · {mLabel(mon)}</h3>
        <div className="grid2" style={{ alignItems: 'end' }}>
          <label>Overall monthly budget<input type="number" min="0" value={d.total || ''} placeholder="Set budget" onChange={setTotal} /></label>
          <label className="chk"><input type="checkbox" checked={d.roll} onChange={setRoll} /> Roll unused budget over to next month <span className="opt">Optional</span></label>
        </div>
        <BudgetKV d={d} tot={tot} sp={s.exp} />
      </div>
      <div className="grid3">
        {d.cats.map(c => {
          const b = d.budgets[c.id], sp = s.byCat[c.id] || 0, p = b ? sp / b * 100 : 0;
          return (
            <div className="card" key={c.id}>
              <div className="row"><b>{c.icon} {c.name}</b><b style={{ color: stc(p) }}>{b ? Math.round(p) + '%' : 'No budget'}</b></div>
              <div className="bar"><i style={{ width: `${Math.min(100, p)}%`, background: stc(p) }} /></div>
              <div className="row">
                <small>Spent {money(d.cur, sp)}</small>
                <small>Remaining {b ? money(d.cur, Math.max(0, b - sp)) : '–'}</small>
              </div>
              <input type="number" min="0" placeholder="Set budget" value={b || ''} style={{ marginTop: 10 }} onChange={e => setBud(c.id, e.target.value)} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Categories({ d, mon, mut, ask, flash }) {
  const s = sums(d, mon), [name, setName] = useState(''), [col, setCol] = useState(COLS[0]);
  const cnt = {};
  d.tx.forEach(t => { if (t.date.slice(0, 7) === mon) cnt[t.cat] = (cnt[t.cat] || 0) + 1; });

  const add = e => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (d.cats.some(c => c.name.toLowerCase() === n.toLowerCase())) return flash('That category already exists');
    mut(x => { x.cats.push({ id: uid(), name: n, icon: '🏷️', color: col, custom: 1 }); }, 'Category added');
    setName('');
  };

  const rename = c => ask('Rename category', '', 'Save', false, v => {
    const nm = (v || '').trim();
    if (!nm) return false;
    mut(x => { cat(x, c.id).name = nm; }, 'Category renamed');
  }, { input: c.name });

  const del = c => ask('Delete category?', 'Its entries will move to Other, and its budget will be removed.', 'Delete category', true, () =>
    mut(x => {
      x.tx.forEach(t => { if (t.cat === c.id) t.cat = 'other'; });
      delete x.budgets[c.id];
      x.cats = x.cats.filter(k => k.id !== c.id);
    }, 'Category deleted'));

  return (
    <div className="grid2">
      <div className="card">
        <h3>🗂️ Your categories</h3>
        {d.cats.map(c => (
          <div className="tx" key={c.id}>
            <div className="ico" style={{ background: c.color + '22' }}>{c.icon}</div>
            <div className="grow">
              <b>{c.name}</b> <span className={`pill ${c.custom ? '' : 'ok'}`}>{c.custom ? 'Custom' : 'Default'}</span>
              <small>{cnt[c.id] || 0} transactions · {money(d.cur, s.byCat[c.id] || 0)} this month</small>
            </div>
            {c.custom
              ? <><span className="lnk" onClick={() => rename(c)}>Rename</span><button className="icb" onClick={() => del(c)}>🗑</button></>
              : <small className="mut" style={{ marginLeft: 8 }}>Locked</small>}
          </div>
        ))}
      </div>
      <div className="card">
        <h3>➕ New category</h3>
        <form onSubmit={add}>
          <input required maxLength={24} placeholder="Category name (e.g. Gifts)" value={name} onChange={e => setName(e.target.value)} />
          <p className="mut" style={{ margin: '6px 0' }}>Colour</p>
          <div className="sw">
            {COLS.map(c => (
              <label key={c}>
                <input type="radio" name="col" value={c} checked={col === c} onChange={() => setCol(c)} hidden />
                <i style={{ background: c }} />
              </label>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 14 }}>Add category</button>
        </form>
        <p className="mut" style={{ marginTop: 14 }}>Default categories are locked. Deleting a custom category moves its transactions to Other.</p>
      </div>
    </div>
  );
}

export function Reports({ d, mon, rp, setRp }) {
  const ms = Array.from({ length: rp }, (_, i) => prevM(mon, rp - 1 - i));
  const pv = Array.from({ length: rp }, (_, i) => prevM(mon, 2 * rp - 1 - i));
  const agg = L => {
    const r = { inc: 0, exp: 0, byCat: {} };
    L.forEach(m => {
      const s = sums(d, m);
      r.inc += s.inc;
      r.exp += s.exp;
      Object.entries(s.byCat).forEach(([k, v]) => { r.byCat[k] = (r.byCat[k] || 0) + v; });
    });
    return r;
  };
  const cur = agg(ms), prv = agg(pv);
  const items = Object.entries(cur.byCat).map(([id, v]) => ({ v, c: cat(d, id).color, l: cat(d, id).name })).sort((a, b) => b.v - a.v);
  const ser = ms.map(m => ({ l: mName(m), ...sums(d, m) }));
  const delta = (a, b, good) => {
    const x = a - b, p = b ? Math.round(Math.abs(x) / b * 100) : 0;
    return <b className={(x >= 0) === good ? 't-ok' : 't-bad'}>{x < 0 ? 'down' : 'up'} {money(d.cur, Math.abs(x))} ({p}%)</b>;
  };
  const chips = [[1, 'Month'], [3, '3 months'], [6, '6 months'], [12, '12 months']];

  return (
    <>
      <div className="row" style={{ marginBottom: 16, justifyContent: 'flex-start' }}>
        <b>Period ending {mLabel(mon)}</b>
        <div className="seg" style={{ marginLeft: 12 }}>
          {chips.map(([n, l]) => <button key={n} className={`chip ${rp === n ? 'on' : ''}`} onClick={() => setRp(n)}>{l}</button>)}
        </div>
      </div>
      <div className="grid3">
        <div className="stat s-ok"><div className="ico" style={{ background: 'var(--ok)' }}>👛</div><div><small>Income</small><b className="t-ok">{money(d.cur, cur.inc)}</b></div></div>
        <div className="stat s-bad"><div className="ico" style={{ background: 'var(--bad)' }}>−</div><div><small>Expenses</small><b className="t-bad">{money(d.cur, cur.exp)}</b></div></div>
        <div className="stat s-br"><div className="ico" style={{ background: 'var(--br)' }}>📊</div><div><small>Net savings</small><b className="blue">{money(d.cur, cur.inc - cur.exp)}</b></div></div>
      </div>
      <div className="grid2">
        <div className="card"><h3>🥧 Spending by category</h3><Legend cur={d.cur} items={items} /></div>
        <div className="card"><h3>📊 Income and spending over time</h3><Bars s={ser} /><small>Green is income, red is spending.</small></div>
      </div>
      <div className="card">
        <h3>📅 This period vs previous period</h3>
        <div className="grid2">
          <div><small>Spending</small><b style={{ fontSize: 24 }}>{money(d.cur, cur.exp)}</b><br /><small>{delta(cur.exp, prv.exp, false)} compared with the previous period.</small></div>
          <div><small>Income</small><b style={{ fontSize: 24 }}>{money(d.cur, cur.inc)}</b><br /><small>{delta(cur.inc, prv.inc, true)} compared with the previous period.</small></div>
        </div>
      </div>
    </>
  );
}

export function Notifications({ d, mon, mut }) {
  const n = notes(d, mon);
  const pref = (k, label) => (
    <div className="tg">
      <span>{label}<small>Optional</small></span>
      <input type="checkbox" checked={d[k]} onChange={e => { const v = e.target.checked; mut(x => { x[k] = v; }); }} />
    </div>
  );
  return (
    <div className="grid2">
      <div className="card">
        <div className="row">
          <h3>🔔 Notification centre</h3>
          <span className="lnk" onClick={() => mut(x => { x.seen = notes(x, mon).map(y => y.k); }, 'All notifications marked as read')}>Mark all as read</span>
        </div>
        {n.map(x => (
          <div key={x.k} className={`note ${d.seen.includes(x.k) ? '' : 'new'}`}>
            <div className="ico" style={{ background: 'var(--line)' }}>{x.ic}</div>
            <div className="grow"><b>{x.t}</b><small>{x.x}</small></div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>⚙️ Alert preferences</h3>
        <div className="tg"><span>In-app alert at 80% of a budget<small>Always on</small></span><input type="checkbox" checked disabled readOnly /></div>
        <div className="tg"><span>In-app alert at 100% of a budget<small>Always on</small></span><input type="checkbox" checked disabled readOnly /></div>
        {pref('emailAlerts', 'Email alerts')}
        {pref('weekly', 'Weekly spending summary')}
        <p className="mut" style={{ marginTop: 12 }}>Email notifications are optional and can be turned off at any time. Email delivery isn't connected in this preview.</p>
      </div>
    </div>
  );
}

export function Settings({ d, me, mut, flash, logout, ask, delAccount }) {
  const [name, setName] = useState(me.name), [pw, setPw] = useState('');
  const set = (k, v) => mut(x => { x[k] = v; });
  const save = e => {
    e.preventDefault();
    if (pw && pw.length < 6) return flash('New password must be at least 6 characters');
    const nm = name.trim(), newPw = pw;
    mut((x, u) => { u.name = nm; if (newPw) u.pw = newPw; }, 'Profile saved');
    setPw('');
  };

  return (
    <div className="grid2">
      <div className="card">
        <h3>👤 Profile</h3>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <div className="av">{me.name[0].toUpperCase()}</div>
          <div><b>{me.name}</b><small>{me.email}</small></div>
        </div>
        <form onSubmit={save} style={{ marginTop: 14 }}>
          <label>Full name<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>New password<input type="password" minLength={6} placeholder="Leave blank to keep" value={pw} onChange={e => setPw(e.target.value)} /></label>
          <button className="btn">Save profile</button>
        </form>
      </div>
      <div className="card">
        <h3>🛠️ Preferences</h3>
        <label>Default currency
          <select value={d.cur} onChange={e => set('cur', e.target.value)}>
            {['USD', 'NGN', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Date format
          <select value={d.df} onChange={e => set('df', e.target.value)}>
            <option value="mdy">MMM D, YYYY</option>
            <option value="dmy">DD/MM/YYYY</option>
            <option value="iso">YYYY-MM-DD</option>
          </select>
        </label>
        <p className="mut" style={{ margin: '8px 0' }}>Theme <span className="opt">Optional</span></p>
        <div className="seg">
          {['system', 'light', 'dark'].map(t => (
            <button key={t} className={d.theme === t ? 'on' : ''} onClick={() => set('theme', t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <p className="mut" style={{ marginTop: 12, fontSize: 13 }}>Amounts are shown in this currency. Multi-currency entries aren't supported yet.</p>
      </div>
      <div className="card">
        <h3>🔐 Account</h3>
        <p>Signed in as <b>{me.email}</b></p>
        <button className="btn ghost" onClick={logout}>Log out</button>
        <hr />
        <p><b>Session</b><small>Expires after 30 days of inactivity.</small></p>
        <p><b>Your data</b><small>Only you can see your transactions.</small></p>
        <div className="danger-box">
          <b className="t-bad">Delete account and all data</b>
          <div style={{ marginTop: 10 }}>
            <button className="btn danger" onClick={() => ask('Delete your account?', 'Your profile, transactions, budgets and settings will be permanently deleted. This cannot be undone.', 'Delete account', true, delAccount)}>Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
