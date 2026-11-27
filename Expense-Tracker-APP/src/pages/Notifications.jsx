// Notifications.jsx
// Budget warnings and reminders, plus the alert settings.

import { notifications } from '../lib.js';

export default function Notifications({ data, month, changeData }) {
  const list = notifications(data, month);

  function markAllAsRead() {
    changeData(draft => {
      draft.seen = notifications(draft, month).map(n => n.key);
    }, 'All notifications marked as read');
  }

  // Turns an on/off setting, for example emailAlerts, on or off.
  function setSetting(key, turnedOn) {
    changeData(draft => { draft[key] = turnedOn; });
  }

  return (
    <div className="grid2">
      <div className="card">
        <div className="row">
          <h3>🔔 Notification centre</h3>
          <span className="lnk" onClick={markAllAsRead}>Mark all as read</span>
        </div>
        {list.map(n => (
          <div key={n.key} className={`note ${data.seen.includes(n.key) ? '' : 'new'}`}>
            <div className="ico" style={{ background: 'var(--line)' }}>{n.icon}</div>
            <div className="grow">
              <b>{n.title}</b>
              <small>{n.text}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>⚙️ Alert preferences</h3>
        <div className="tg">
          <span>In-app alert at 80% of a budget<small>Always on</small></span>
          <input type="checkbox" checked disabled readOnly />
        </div>
        <div className="tg">
          <span>In-app alert at 100% of a budget<small>Always on</small></span>
          <input type="checkbox" checked disabled readOnly />
        </div>
        <div className="tg">
          <span>Email alerts<small>Optional</small></span>
          <input type="checkbox" checked={data.emailAlerts} onChange={e => setSetting('emailAlerts', e.target.checked)} />
        </div>
        <div className="tg">
          <span>Weekly spending summary<small>Optional</small></span>
          <input type="checkbox" checked={data.weekly} onChange={e => setSetting('weekly', e.target.checked)} />
        </div>
        <p className="mut" style={{ marginTop: 12 }}>
          Email notifications are optional and can be turned off at any time. Email delivery isn't connected in this preview.
        </p>
      </div>
    </div>
  );
}
