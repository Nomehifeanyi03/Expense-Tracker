// SignIn.jsx
// The sign-up, sign-in, forgot-password and reset-password screen.
// `mode` decides which one is shown: 'register', 'login', 'forgot' or 'reset'.

import { useAuth } from '../../hooks/useAuth.jsx';

// The title, subtitle and button text for each screen.
const SCREEN_TEXT = {
  login: { title: 'Welcome back', subtitle: 'Sign in to manage your spending', button: 'Sign in' },
  register: { title: 'Create your account', subtitle: 'Start tracking your spending today', button: 'Sign up' },
  forgot: { title: 'Forgot password?', subtitle: "Enter your email and we'll send you a reset link", button: 'Send reset link' },
  reset: { title: 'Set a new password', subtitle: 'Choose a new password for your account', button: 'Update password' },
};

export default function SignIn({ mode, changeMode, resetEmail, setResetEmail, showMessage, goBack }) {
  const { login, register, hasAccount, resetPassword } = useAuth();
  const text = SCREEN_TEXT[mode];

  // Sign up and Sign in share the same two tabs. The other screens don't show them.
  const showTabs = mode === 'login' || mode === 'register';

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    const form = new FormData(event.target);
    const email = (form.get('email') || '').trim().toLowerCase();
    const password = form.get('pw');

    if (mode === 'login') {
      const error = login(email, password);
      if (error) showMessage(error);
    } else if (mode === 'register') {
      const error = register({
        name: form.get('name'),
        email,
        password,
        demo: form.get('demo') === 'on', // a ticked checkbox sends "on"
      });
      if (error) showMessage(error);
    } else if (mode === 'forgot') {
      if (hasAccount(email)) {
        setResetEmail(email);
        changeMode('reset');
        showMessage('Reset link sent. Demo: set a new password below.');
      } else {
        showMessage('If that email is registered, a reset link is on its way.');
      }
    } else {
      // reset mode
      if (form.get('pw') !== form.get('pw2')) {
        showMessage('Passwords do not match');
        return;
      }
      resetPassword(resetEmail, password);
      changeMode('login');
      showMessage('Password updated. Please sign in.');
    }
  }

  // The links under the form.
  let links;
  if (mode === 'login') {
    links = (
      <>
        <span className="lnk" onClick={() => changeMode('register')}>Create an account</span>
        {' · '}
        <span className="lnk" onClick={() => changeMode('forgot')}>Forgot password?</span>
      </>
    );
  } else if (mode === 'register') {
    links = (
      <>
        Already have an account?{' '}
        <span className="lnk" onClick={() => changeMode('login')}>Sign in</span>
      </>
    );
  } else {
    links = <span className="lnk" onClick={() => changeMode('login')}>Back to sign in</span>;
  }

  return (
    <div className="auth-wrap">
      <div className="card auth">
        <button type="button" className="auth-back" onClick={goBack}>Back to home</button>

        {showTabs && (
          <div className="auth-tabs" role="group" aria-label="Account access">
            <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')}>Sign up</button>
            <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')}>Sign in</button>
          </div>
        )}

        <div className="sbrand" style={{ marginBottom: 6 }}>
          <div className="logo">👛</div>
          <b>Expense</b>
          <b className="blue">Tracker</b>
        </div>
        <h2 style={{ textAlign: 'center' }}>{text.title}</h2>
        <p className="mut" style={{ textAlign: 'center', margin: '0 0 18px' }}>{text.subtitle}</p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && <input name="name" required placeholder="Full name" />}
          {mode !== 'reset' && <input name="email" type="email" required placeholder="Email address" />}
          {(mode === 'login' || mode === 'register') && (
            <input name="pw" type="password" minLength={6} required placeholder="Password (min 6 characters)" />
          )}
          {mode === 'register' && (
            <label className="chk">
              <input type="checkbox" name="demo" defaultChecked /> Load sample data to explore
            </label>
          )}
          {mode === 'reset' && (
            <>
              <input name="pw" type="password" minLength={6} required placeholder="New password" />
              <input name="pw2" type="password" minLength={6} required placeholder="Confirm new password" />
            </>
          )}
          <button className="btn" style={{ width: '100%' }}>{text.button}</button>
        </form>

        {showTabs && (
          <>
            <p className="mut" style={{ textAlign: 'center', margin: '12px 0' }}>or</p>
            <button className="btn ghost" style={{ width: '100%' }} disabled>
              Continue with Google (not connected yet)
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 16 }}>{links}</p>
      </div>
    </div>
  );
}
