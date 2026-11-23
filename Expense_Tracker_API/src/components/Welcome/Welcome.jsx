import photo from '../../assets/welcome-photo.jpg';
import './Welcome.css';

const FEATURES = [
  { icon: '👛', lines: ['Record', 'Expenses'], tone: 'blue' },
  { icon: '📈', lines: ['View', 'Reports'], tone: 'green' },
  { icon: '🎯', lines: ['Reach Your', 'Goals'], tone: 'purple' },
];

// Landing page shown to signed-out visitors.
// onStart('register' | 'login') opens the sign up or sign in screen.
export default function Welcome({ onStart }) {
  return (
    <div className="welcome">
      <header className="welcome-nav">
        <div className="welcome-brand">
          <span className="welcome-logo" aria-hidden="true">👛</span>
          <span>Expense <span className="welcome-brand-accent">Tracker</span></span>
        </div>

        <nav className="welcome-links" aria-label="Welcome">
          <a href="#top" className="welcome-link is-active" aria-current="page">Home</a>
          <button type="button" className="welcome-link" onClick={() => onStart('login')}>Sign in</button>
          <button type="button" className="welcome-signup" onClick={() => onStart('register')}>Sign up</button>
        </nav>
      </header>

      <main className="welcome-hero" id="top">
        <div className="welcome-copy">
          <p className="welcome-script">Welcome to My</p>
          <h1 className="welcome-title">Expense <span>Tracker</span></h1>

          <svg className="welcome-swoosh" viewBox="0 0 560 22" aria-hidden="true">
            <path d="M6 15 C 150 3, 390 2, 554 9" />
          </svg>

          <p className="welcome-sub">
            Track your spending, manage your budget, and achieve your financial goals!
          </p>

          <button type="button" className="welcome-start" onClick={() => onStart('register')}>
            <svg className="bars" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="12" width="4" height="9" rx="1" />
              <rect x="10" y="7" width="4" height="14" rx="1" />
              <rect x="17" y="3" width="4" height="18" rx="1" />
            </svg>
            Get Started
            <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <ul className="welcome-features">
            {FEATURES.map(f => (
              <li key={f.lines.join(' ')} className={`welcome-feature tone-${f.tone}`}>
                <span className="welcome-feature-icon" aria-hidden="true">{f.icon}</span>
                <span>{f.lines[0]}<br />{f.lines[1]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-photo">
          <img src={photo} alt="A piggy bank beside a notebook with a checklist: track expenses, set a budget, save more" />
        </div>
      </main>

      <svg className="welcome-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path className="wave-green" d="M0 58 C 320 118, 640 6, 1000 52 C 1180 76, 1330 52, 1440 40 L1440 120 L0 120 Z" />
        <path className="wave-navy" d="M0 84 C 330 118, 700 40, 1040 82 C 1200 100, 1340 84, 1440 74 L1440 120 L0 120 Z" />
      </svg>
    </div>
  );
}
