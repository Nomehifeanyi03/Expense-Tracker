// Navbar.jsx
// The sidebar menu on the left of every tracker page.
// (It is a sidebar, not a top bar. The name was kept from the first version.)

import './Navbar.css';

// One entry per menu button.
// `page` is the page to open. `type` is used only by the two "Add" buttons:
// 'e' = expense, 'i' = income.
const MENU = [
  { page: 'dash', icon: '🏠', label: 'Dashboard' },
  { page: 'add', icon: '➕', label: 'Add Expense', type: 'e' },
  { page: 'add', icon: '💰', label: 'Add Income', type: 'i' },
  { page: 'tx', icon: '📋', label: 'Transactions' },
  { page: 'bud', icon: '🎯', label: 'Budgets' },
  { page: 'cats', icon: '🗂️', label: 'Categories' },
  { page: 'rep', icon: '📊', label: 'Reports' },
  { page: 'notif', icon: '🔔', label: 'Notifications' },
  { page: 'acc', icon: '⚙️', label: 'Settings' },
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
        {MENU.map(item => {
          // A button is highlighted when its page is open.
          // The two Add buttons also need the matching entry type.
          const isActive = view === item.page && (item.type === undefined || item.type === ftype);
          return (
            <button
              key={item.label}
              type="button"
              className={isActive ? 'on' : ''}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.page, null, item.type)}
            >
              {item.icon} {item.label}
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
