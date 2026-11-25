import { useEffect, useState } from 'react';
import { today, unread} from './lib.js';
import { Dashboard, Transactions, EntryForm, Budgets, Categories, Reports, Notifications, Settings } from './views.jsx';
import { useAuth } from './hooks/useAuth.jsx';
import { useAppRoute } from './hooks/useAppRoute.js';
import Navbar from './components/Navbar/Navbar.jsx';
import Display from './components/Display/Display.jsx';
import Footer from './components/Footer/Footer.jsx';
import Welcome from './components/Welcome/Welcome.jsx';
import './App.css';

const PAGES = { dash: Dashboard, tx: Transactions, add: EntryForm, bud: Budgets, cats: Categories, rep: Reports, notif: Notifications, acc: Settings };

// Signed-out screens have their own addresses, so the browser's back and forward buttons work.
const MODE_BY_PATH = { '/sign-up': 'register', '/sign-in': 'login', '/forgot-password': 'forgot', '/reset-password': 'reset' };
const PATH_BY_MODE = { register: '/sign-up', login: '/sign-in', forgot: '/forgot-password', reset: '/reset-password' };

export default function App() {
  const { me, logout, deleteAccount, updateData } = useAuth();
  const { path, navigate } = useAppRoute();
  const [view, setView] = useState('dash');
  const [ftype, setFtype] = useState('e');
  const [editId, setEditId] = useState(null);
  const [mon, setMon] = useState(today().slice(0, 7));
  const [rp, setRp] = useState(3);
  const [resetFor, setResetFor] = useState('');
  const [msg, setMsg] = useState('');
  const [dlg, setDlg] = useState(null);


  // The reset step needs the email from the forgot step. Without it (e.g. after a reload), show the forgot step.
  let authMode = MODE_BY_PATH[path];
  if (authMode === 'reset' && !resetFor) authMode = 'forgot';

  const flash = t => { setMsg(t); setTimeout(() => setMsg(''), 2600); };
  const mut = (fn, text) => { updateData(fn); if (text) flash(text); };
  const go = (v, id, t) => { setView(v); setEditId(id ?? null); if (t) setFtype(t); window.scrollTo(0, 0); };
  const ask = (title, text, ok, danger, onOk, extra = {}) => setDlg({ title, msg: text, ok, danger, onOk, ...extra });

  // Get Started and the header buttons add a history entry, so the browser back button returns to the welcome page.
  const openAuth = mode => navigate(PATH_BY_MODE[mode]);
  // Switching between sign up, sign in, forgot and reset replaces the entry, so history stays: welcome, one auth screen.
  const setAuthMode = mode => navigate(PATH_BY_MODE[mode], { replace: true });
  // "Back to home" goes back to the welcome page when this app opened the screen.
  // Otherwise (for example, a screen opened from a bookmark) it replaces the screen with the welcome page.
  const goHome = () => {
    if (window.history.state?.app) window.history.back();
    else navigate('/', { replace: true });
  };
  // Signing out or deleting the account returns to the welcome page.
  const signOut = () => { logout(); navigate('/', { replace: true }); };
  const removeAccount = () => { deleteAccount(); navigate('/', { replace: true }); };

  // Once signed in, the sign in addresses are no longer needed.
  useEffect(() => {
    if (me && MODE_BY_PATH[path]) navigate('/', { replace: true });
  }, [me, path, navigate]);

  // Shown on every screen, so sign-in errors and confirmations are visible.
  const toast = msg && <div id="toast" className="on">{msg}</div>;

  if (!me) {
    return (
      <>
        {authMode
          ? <Auth mode={authMode} setMode={setAuthMode} resetFor={resetFor} setResetFor={setResetFor} flash={flash} onBack={goHome} />
          : <Welcome onStart={openAuth} />}
        {toast}
      </>
    );
  }

  const d = me.d;
  const Page = PAGES[view];
  const pageProps = { d, me, mon, rp, setRp, go, mut, flash, ask, ftype, editId, logout: signOut, delAccount: removeAccount };

  return (
    <div className="app">
      <Navbar view={view} ftype={ftype} onNavigate={go} onLogout={signOut} />

      <div className="content">
        <main>
          <Display
            firstName={me.name.split(' ')[0]}
            mon={mon}
            onMonthChange={setMon}
            unread={unread(d, mon)}
            onOpenNotifications={() => go('notif')}
          />
          <Page key={view + ftype + editId} {...pageProps} />
        </main>
        <Footer onNavigate={go} />
      </div>

      {dlg && <Dialog dlg={dlg} setDlg={setDlg} />}
      {toast}
    </div>
  );
}

function Dialog({ dlg, setDlg }) {
  const close = () => setDlg(null);
  return (
    <div className="modal on" onClick={e => e.target === e.currentTarget && close()}>
      <div className="card mbox">
        <h3>{dlg.title}</h3>
        {dlg.msg && <p className="mut">{dlg.msg}</p>}
        {dlg.area && <textarea rows={10} readOnly value={dlg.area} onClick={e => e.target.select()} />}
        {dlg.input !== undefined && <input value={dlg.input} onChange={e => setDlg({ ...dlg, input: e.target.value })} />}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={close}>Cancel</button>
          {dlg.onOk && (
            <button className={'btn' + (dlg.danger ? ' danger' : '')} onClick={() => { if (dlg.onOk(dlg.input) !== false) close(); }}>{dlg.ok}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Auth({ mode, setMode, resetFor, setResetFor, flash, onBack }) {
  const { login, register, hasAccount, resetPassword } = useAuth();
  const showTabs = mode === 'login' || mode === 'register';
  const T = {
    login: ['Welcome back', 'Sign in to manage your spending', 'Sign in'],
    register: ['Create your account', 'Start tracking your spending today', 'Sign up'],
    forgot: ['Forgot password?', "Enter your email and we'll send you a reset link", 'Send reset link'],
    reset: ['Set a new password', 'Choose a new password for your account', 'Update password'],
  }[mode];

  const submit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const email = (f.email || '').trim().toLowerCase();

    if (mode === 'login') {
      const error = login(email, f.pw);
      if (error) flash(error);
      return;
    }
    if (mode === 'register') {
      const error = register({ name: f.name, email, password: f.pw, demo: !!f.demo });
      if (error) flash(error);
      return;
    }
    if (mode === 'forgot') {
      if (hasAccount(email)) {
        setResetFor(email);
        setMode('reset');
        flash('Reset link sent. Demo: set a new password below.');
      } else {
        flash('If that email is registered, a reset link is on its way.');
      }
      return;
    }
    if (f.pw !== f.pw2) return flash('Passwords do not match');
    resetPassword(resetFor, f.pw);
    setMode('login');
    flash('Password updated. Please sign in.');
  };

  const links = {
    login: <><span className="lnk" onClick={() => setMode('register')}>Create an account</span> · <span className="lnk" onClick={() => setMode('forgot')}>Forgot password?</span></>,
    register: <>Already have an account? <span className="lnk" onClick={() => setMode('login')}>Sign in</span></>,
    forgot: <span className="lnk" onClick={() => setMode('login')}>Back to sign in</span>,
    reset: <span className="lnk" onClick={() => setMode('login')}>Back to sign in</span>,
  }[mode];

  return (
    <div className="auth-wrap">
      <div className="card auth">
        <button type="button" className="auth-back" onClick={onBack}>Back to home</button>

        {showTabs && (
          <div className="auth-tabs" role="group" aria-label="Account access">
            <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Sign up</button>
            <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
          </div>
        )}

        <div className="sbrand" style={{ marginBottom: 6 }}><div className="logo">👛</div><b>Expense</b><b className="blue">Tracker</b></div>
        <h2 style={{ textAlign: 'center' }}>{T[0]}</h2>
        <p className="mut" style={{ textAlign: 'center', margin: '0 0 18px' }}>{T[1]}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <input name="name" required placeholder="Full name" />}
          {mode !== 'reset' && <input name="email" type="email" required placeholder="Email address" />}
          {(mode === 'login' || mode === 'register') && <input name="pw" type="password" minLength={6} required placeholder="Password (min 6 characters)" />}
          {mode === 'register' && <label className="chk"><input type="checkbox" name="demo" defaultChecked /> Load sample data to explore</label>}
          {mode === 'reset' && <>
            <input name="pw" type="password" minLength={6} required placeholder="New password" />
            <input name="pw2" type="password" minLength={6} required placeholder="Confirm new password" />
          </>}
          <button className="btn" style={{ width: '100%' }}>{T[2]}</button>
        </form>
        {showTabs && <>
          <p className="mut" style={{ textAlign: 'center', margin: '12px 0' }}>or</p>
          <button className="btn ghost" style={{ width: '100%' }} disabled>Continue with Google (not connected yet)</button>
        </>}
        <p style={{ textAlign: 'center', marginTop: 16 }}>{links}</p>
      </div>
    </div>
  );
 }
