import './Footer.css';

export default function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Expense Tracker</p>

      <div className="footer-links">
        <button type="button" onClick={() => onNavigate('dash')}>Dashboard</button>
        <button type="button" onClick={() => onNavigate('rep')}>Reports</button>
        <button type="button" onClick={() => onNavigate('acc')}>Settings</button>
      </div>

      <p className="footer-note">Demo preview: your data is saved in this browser only.</p>
    </footer>
  );
}
