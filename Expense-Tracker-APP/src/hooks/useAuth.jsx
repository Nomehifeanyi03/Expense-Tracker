// useAuth.jsx
// Accounts and sign-in. Everything is saved in the browser's localStorage.
//
// The saved data looks like this:
//   {
//     users:   { 'someone@example.com': { email, name, pw, d: { ...their data } } },
//     session: { email: 'someone@example.com', ts: 1700000000000 }
//   }
// "session" says who is signed in and when they were last active.

import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEY, DAY, makeNewData, runRecurring } from '../lib.js';

// ---- THE SWITCH ----------------------------------------------------------------
// true  = no sign-up or sign-in. The app opens straight to the dashboard, using a
//         demo account with sample data. Logout and Delete account do nothing.
// false = the Welcome page and the sign-up and sign-in screens are shown again.
export const SKIP_LOGIN = false;

// The demo account used while SKIP_LOGIN is true.
// The name here is what the greeting shows ("Hello, Guest!"). Change it to any name you like.
const DEMO_ACCOUNT = { email: 'demo@example.com', name: 'Guest', pw: 'demo123' };
// -------------------------------------------------------------------------------

const AuthContext = createContext(null);

// Reads the saved data. If nothing is saved yet (or it is damaged), starts with no users.
function readSavedData() {
  const empty = { users: {}, session: null };
  let saved = empty;
  const text = localStorage.getItem(STORAGE_KEY);
  if (text) {
    try {
      saved = JSON.parse(text);
    } catch {
      saved = empty;
    }
  }
  if (!saved || !saved.users) saved = empty;

  if (SKIP_LOGIN) {
    // Create the demo account if it does not exist yet, and sign it in every time the app opens.
    if (!saved.users[DEMO_ACCOUNT.email]) {
      saved.users[DEMO_ACCOUNT.email] = {
        email: DEMO_ACCOUNT.email,
        name: DEMO_ACCOUNT.name,
        pw: DEMO_ACCOUNT.pw,
        d: makeNewData(true),
      };
    }
    saved.session = { email: DEMO_ACCOUNT.email, ts: Date.now() };
  }
  return saved;
}

// Changes the signed-in user's data.
// `change` is a function. It receives the user's data (called "draft") and changes it.
// We change a copy, so React notices the new object and redraws the screen.
function applyChange(saved, change) {
  const copy = structuredClone(saved);
  const email = copy.session ? copy.session.email : null;
  const user = email ? copy.users[email] : null;
  if (!user) return saved; // nobody is signed in, so there is nothing to change

  change(user.d, user);
  runRecurring(user.d);          // add any repeating entries that are due
  copy.session.ts = Date.now();  // this is activity, so extend the 30-day session
  return copy;
}

export function AuthProvider({ children }) {
  const [saved, setSaved] = useState(readSavedData);

  // Who is signed in? Only if there is a session and it is less than 30 days old.
  let me = null;
  const session = saved.session;
  if (session && saved.users[session.email]) {
    const ageInMs = Date.now() - (session.ts || Date.now());
    if (ageInMs <= 30 * DAY) me = saved.users[session.email];
  }

  // Save to the browser every time the data changes.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved]);

  // When the page opens with someone signed in, add any due repeating entries once.
  useEffect(() => {
    if (me) setSaved(current => applyChange(current, () => {}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signs in. Returns an error message, or null if it worked.
  function login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const account = saved.users[cleanEmail];
    if (!account || account.pw !== password) return 'Email or password is incorrect';
    setSaved(current => applyChange({ ...current, session: { email: cleanEmail } }, () => {}));
    return null;
  }

  // Creates an account and signs in. Returns an error message, or null if it worked.
  function register({ name, email, password, demo }) {
    const cleanEmail = email.trim().toLowerCase();
    if (saved.users[cleanEmail]) return 'An account with that email already exists';
    const account = { email: cleanEmail, name: name.trim(), pw: password, d: makeNewData(!!demo) };
    setSaved(current => applyChange({
      ...current,
      users: { ...current.users, [cleanEmail]: account },
      session: { email: cleanEmail },
    }, () => {}));
    return null;
  }

  function hasAccount(email) {
    return Boolean(saved.users[email.trim().toLowerCase()]);
  }

  // Sets a new password for an account. (There is no email in this demo.)
  function resetPassword(email, newPassword) {
    const cleanEmail = email.trim().toLowerCase();
    setSaved(current => {
      const account = current.users[cleanEmail];
      if (!account) return current;
      return { ...current, users: { ...current.users, [cleanEmail]: { ...account, pw: newPassword } } };
    });
  }

  // Signs out. The account and its data stay saved.
  // While SKIP_LOGIN is true there is nothing to sign out of, so this does nothing.
  function logout() {
    if (SKIP_LOGIN) return;
    setSaved(current => ({ ...current, session: null }));
  }

  // Deletes the signed-in account and all of its data.
  // While SKIP_LOGIN is true the demo account cannot be deleted, so this does nothing.
  function deleteAccount() {
    if (SKIP_LOGIN) return;
    const email = me ? me.email : null;
    setSaved(current => {
      const copy = structuredClone(current);
      if (email) delete copy.users[email];
      copy.session = null;
      return copy;
    });
  }

  // Pages use this to save their changes. Example: updateData(draft => { draft.tx.push(entry); })
  function updateData(change) {
    setSaved(current => applyChange(current, change));
  }

  const value = { me, login, register, hasAccount, resetPassword, logout, deleteAccount, updateData };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Any component can call useAuth() to get the values above.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
