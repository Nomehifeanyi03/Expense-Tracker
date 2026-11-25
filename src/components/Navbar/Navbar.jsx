import './Navbar.css';

const NAV = [
  ['dash', '🏠', 'Dashboard'],
  ['add', '➕', 'Add Expense', 'e'],
  ['add', '💰', 'Add Income', 'i'],
  ['tx', '📋', 'Transactions'],
  ['bud', '🎯', 'Budgets'],
  ['cats', '🗂️', 'Categories'],
  ['rep', '📊', 'Reports'],
  ['notif', '🔔', 'Notifications'],
  ['acc', '⚙️', 'Settings'],
];

export default function Navbar({ view, ftype, onNavigate, onLogout }) {
  return (
    <aside className="navbar">
      <div className="sbrand">
        <div className="logo">👛</div>
        <b>Expense</b>
        <b className="blue">Tracker</b>
      </div>

      <nav className="nav" aria-label="Main">
        {NAV.map(([key, icon, label, type]) => {
          const active = view === key && (!type || ftype === type);
          return (
            <button
              key={label}
              type="button"
              className={active ? 'on' : ''}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(key, null, type)}
            >
              {icon} {label}
            </button>
          );
        })}
      </nav>

      <div className="foot">
        <button type="button" onClick={onLogout}>↪ Logout</button>
        <div className="tip">🎯 Spend wisely,<br />live better!</div>
      </div>
    </aside>
  );
}
