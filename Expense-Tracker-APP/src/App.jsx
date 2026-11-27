// App.jsx
// The main screen controller. It decides what to show:
//   - Not signed in, no sign-in address  -> the Welcome page
//   - Not signed in, sign-in address     -> Sign up / Sign in / Forgot password screens
//   - Signed in                          -> the tracker: sidebar, header, one page, footer

import { useEffect, useState } from 'react';
import { todayText, unreadCount } from './lib.js';
import { useAuth } from './hooks/useAuth.jsx';
import { useAppRoute } from './hooks/useAppRoute.js';
import Navbar from './components/Navbar/Navbar.jsx';
import Display from './components/Display/Display.jsx';
import Footer from './components/Footer/Footer.jsx';
import Welcome from './components/Welcome/Welcome.jsx';
import SignIn from './components/SignIn/SignIn.jsx';
import Dialog from './components/Dialog/Dialog.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import AddEntry from './pages/AddEntry.jsx';
import Budgets from './pages/Budgets.jsx';
import Categories from './pages/Categories.jsx';
import Reports from './pages/Reports.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import './App.css';

// The tracker pages, using the short names the sidebar uses.
const PAGES = {
  dash: Dashboard,
  tx: Transactions,
  add: AddEntry,
  bud: Budgets,
  cats: Categories,
  rep: Reports,
  notif: Notifications,
  acc: Settings,
};

// Each sign-in screen has its own web address.
const MODE_FROM_PATH = {
  '/sign-up': 'register',
  '/sign-in': 'login',
  '/forgot-password': 'forgot',
  '/reset-password': 'reset',
};
const PATH_FROM_MODE = {
  register: '/sign-up',
  login: '/sign-in',
  forgot: '/forgot-password',
  reset: '/reset-password',
};

export default function App() {
  const { me, logout, deleteAccount, updateData } = useAuth();
  const { path, navigate } = useAppRoute();

  // Things this screen remembers
  const [page, setPage] = useState('dash');                       // which tracker page is open
  const [entryType, setEntryType] = useState('e');                // 'e' = expense, 'i' = income
  const [editingId, setEditingId] = useState(null);               // id of the entry being edited
  const [month, setMonth] = useState(todayText().slice(0, 7));    // for example "2026-11"
  const [reportPeriod, setReportPeriod] = useState(3);            // how many months the reports cover
  const [resetEmail, setResetEmail] = useState('');               // email used on the reset screen
  const [message, setMessage] = useState('');                     // short message at the bottom
  const [dialog, setDialog] = useState(null);                     // pop-up question, or null

  // Which sign-in screen to show, based on the address.
  let signInMode = MODE_FROM_PATH[path];
  // The reset screen needs the email from the forgot-password step.
  // Without it (for example after a page reload), show the forgot-password screen.
  if (signInMode === 'reset' && !resetEmail) signInMode = 'forgot';

  // Shows a short message for about 2.6 seconds.
  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2600);
  }

  // Saves a change to the data, and optionally shows a message.
  function changeData(change, text) {
    updateData(change);
    if (text) showMessage(text);
  }

  // Opens a tracker page. For Add Expense or Add Income, `type` says which one.
  function goToPage(name, id, type) {
    setPage(name);
    setEditingId(id || null);
    if (type) setEntryType(type);
    window.scrollTo(0, 0);
  }

  // Opens the pop-up question. The options are explained in components/Dialog/Dialog.jsx.
  function askQuestion(options) {
    setDialog(options);
  }

  // Get Started and the header buttons open a sign-in screen. This adds a history entry.
  function startSignIn(mode) {
    navigate(PATH_FROM_MODE[mode]);
  }

  // The tabs and links on the sign-in screens swap the current entry instead.
  function changeSignInMode(mode) {
    navigate(PATH_FROM_MODE[mode], { replace: true });
  }

  // "Back to home": use the Back button if this app opened the screen, otherwise go to the start.
  function goBackToWelcome() {
    if (window.history.state && window.history.state.app) window.history.back();
    else navigate('/', { replace: true });
  }

  function signOut() {
    logout();
    navigate('/', { replace: true });
  }

  function removeAccount() {
    deleteAccount();
    navigate('/', { replace: true });
  }

  // Once someone is signed in, the sign-in addresses are no longer needed.
  useEffect(() => {
    if (me && MODE_FROM_PATH[path]) navigate('/', { replace: true });
  }, [me, path]); // eslint-disable-line react-hooks/exhaustive-deps

  // The theme chosen in Settings: 'system', 'light' or 'dark'.
  // It is set on the <html> element, and index.css changes the colours to match.
  // With 'system' the attribute is removed, so the computer's own setting is used.
  const themeChoice = me ? me.d.theme : 'system';
  useEffect(() => {
    const html = document.documentElement;
    if (themeChoice === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', themeChoice);
  }, [themeChoice]);

  const messageBox = message ? <div id="toast" className="on">{message}</div> : null;

  // Not signed in: the Welcome page, or a sign-in screen.
  if (!me) {
    return (
      <>
        {signInMode ? (
          <SignIn
            mode={signInMode}
            changeMode={changeSignInMode}
            resetEmail={resetEmail}
            setResetEmail={setResetEmail}
            showMessage={showMessage}
            goBack={goBackToWelcome}
          />
        ) : (
          <Welcome onStart={startSignIn} />
        )}
        {messageBox}
      </>
    );
  }

  // Signed in: the tracker.
  const Page = PAGES[page];

  // Everything a page might need. Each page uses only the parts it needs.
  const pageProps = {
    data: me.d,
    me,
    month,
    reportPeriod,
    setReportPeriod,
    goToPage,
    changeData,
    showMessage,
    askQuestion,
    entryType,
    editingId,
    logout: signOut,
    deleteAccount: removeAccount,
  };

  return (
    <div className="app">
      <Navbar view={page} ftype={entryType} onNavigate={goToPage} onLogout={signOut} />

      <div className="content">
        <main>
          <Display
            firstName={me.name.split(' ')[0]}
            month={month}
            onMonthChange={setMonth}
            unreadCount={unreadCount(me.d, month)}
            onOpenNotifications={() => goToPage('notif')}
          />
          {/* The key makes the page start fresh when the user opens a different page or entry. */}
          <Page key={page + entryType + editingId} {...pageProps} />
        </main>
        <Footer onNavigate={goToPage} />
      </div>

      {dialog && <Dialog dialog={dialog} setDialog={setDialog} />}
      {messageBox}
    </div>
  );
}
