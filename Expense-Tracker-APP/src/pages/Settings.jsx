// Settings.jsx
// Profile (name and password), preferences (currency, date format, theme),
// and the account section (log out and delete).

import { useState } from 'react';

const THEMES = ['system', 'light', 'dark'];
const CURRENCIES = ['USD', 'NGN', 'EUR', 'GBP'];

export default function Settings({ data, me, changeData, showMessage, logout, askQuestion, deleteAccount }) {
  const [name, setName] = useState(me.name);
  const [newPassword, setNewPassword] = useState('');

  // Saves one setting, for example setSetting('cur', 'NGN').
  function setSetting(key, value) {
    changeData(draft => { draft[key] = value; });
  }

  // Saves the name, and the new password if one was typed.
  function handleSaveProfile(event) {
    event.preventDefault();
    if (newPassword && newPassword.length < 6) {
      showMessage('New password must be at least 6 characters');
      return;
    }
    const cleanName = name.trim();
    // The second value passed to the change function is the account itself (name and password).
    changeData((_draft, account) => {
      account.name = cleanName;
      if (newPassword) account.pw = newPassword;
    }, 'Profile saved');
    setNewPassword('');
  }

  function askDeleteAccount() {
    askQuestion({
      title: 'Delete your account?',
      message: 'Your profile, transactions, budgets and settings will be permanently deleted. This cannot be undone.',
      buttonText: 'Delete account',
      isDanger: true,
      onConfirm: deleteAccount,
    });
  }

  return (
    <div className="grid2">
      <div className="card">
        <h3>👤 Profile</h3>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <div className="av">{me.name[0].toUpperCase()}</div>
          <div><b>{me.name}</b><small>{me.email}</small></div>
        </div>
        <form onSubmit={handleSaveProfile} style={{ marginTop: 14 }}>
          <label>Full name
            <input required value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label>New password
            <input
              type="password"
              minLength={6}
              placeholder="Leave blank to keep"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </label>
          <button className="btn">Save profile</button>
        </form>
      </div>

      <div className="card">
        <h3>🛠️ Preferences</h3>
        <label>Default currency
          <select value={data.cur} onChange={e => setSetting('cur', e.target.value)}>
            {CURRENCIES.map(code => <option key={code}>{code}</option>)}
          </select>
        </label>
        <label>Date format
          <select value={data.df} onChange={e => setSetting('df', e.target.value)}>
            <option value="mdy">MMM D, YYYY</option>
            <option value="dmy">DD/MM/YYYY</option>
            <option value="iso">YYYY-MM-DD</option>
          </select>
        </label>
        <p className="mut" style={{ margin: '8px 0' }}>Theme <span className="opt">Optional</span></p>
        <div className="seg">
          {THEMES.map(theme => (
            <button
              key={theme}
              className={data.theme === theme ? 'on' : ''}
              onClick={() => setSetting('theme', theme)}
            >
              {theme[0].toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
        <p className="mut" style={{ marginTop: 12, fontSize: 13 }}>
          Amounts are shown in this currency. Multi-currency entries aren't supported yet.
        </p>
      </div>

      <div className="card">
        <h3>🔐 Account</h3>
        <p>Signed in as <b>{me.email}</b></p>
        <button className="btn ghost" onClick={logout}>Log out</button>
        <hr />
        <p><b>Session</b><small>Expires after 30 days of inactivity.</small></p>
        <p><b>Your data</b><small>Only you can see your transactions.</small></p>
        <div className="danger-box">
          <b className="t-bad">Delete account and all data</b>
          <div style={{ marginTop: 10 }}>
            <button className="btn danger" onClick={askDeleteAccount}>Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
