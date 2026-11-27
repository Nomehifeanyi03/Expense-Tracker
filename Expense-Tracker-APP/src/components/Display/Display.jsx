// Display.jsx
// The header at the top of every tracker page: greeting, notification bell and month picker.

import './Display.css';

export default function Display({ firstName, month, onMonthChange, unreadCount, onOpenNotifications }) {
  // Only pass the new month on if the box is not empty.
  function handleMonthChange(event) {
    if (event.target.value) onMonthChange(event.target.value);
  }

  const bellLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <header className="top">
      <div>
        <h1>Hello, {firstName}! 👋</h1>
        <p className="mut">Here's your expense summary</p>
      </div>

      <div className="hr">
        <button type="button" className="bell" onClick={onOpenNotifications} aria-label={bellLabel}>
          🔔
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
        <input type="month" value={month} aria-label="Select month" onChange={handleMonthChange} />
      </div>
    </header>
  );
}
