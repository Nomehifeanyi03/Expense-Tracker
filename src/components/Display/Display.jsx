import './Display.css';

// Header shown above every page: greeting, notification bell and month picker.
export default function Display({ firstName, mon, onMonthChange, unread, onOpenNotifications }) {
  return (
    <header className="top">
      <div>
        <h1>Hello, {firstName}! 👋</h1>
        <p className="mut">Here's your expense summary</p>
      </div>

      <div className="hr">
        <button
          type="button"
          className="bell"
          onClick={onOpenNotifications}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          🔔{unread > 0 && <span className="badge">{unread}</span>}
        </button>
        <input
          type="month"
          value={mon}
          aria-label="Select month"
          onChange={e => { if (e.target.value) onMonthChange(e.target.value); }}
        />
      </div>
    </header>
  );
}
