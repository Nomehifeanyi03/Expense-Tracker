import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KEY, DAY, newData, runRecurring } from '../lib.js';


const AuthContext = createContext(null);


const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || { users: {}, session: null }; }
  catch { return { users: {}, session: null }; }
};

// Applies a change to the signed-in user, refreshes recurring entries,
// and extends the 30-day session window.
function applyToUser(state, fn) {
  const next = structuredClone(state);
  const user = next.users[next.session?.email];
  if (!user) return state;
  fn(user.d, user);
  runRecurring(user.d);
  next.session.ts = Date.now();
  return next;
}

export function AuthProvider({ children }) {
  const [db, setDb] = useState(load);

  // A session is valid for 30 days after its last activity.
  const sess = db.session;
  const me = sess && db.users[sess.email] && Date.now() - (sess.ts || Date.now()) <= 30 * DAY
    ? db.users[sess.email]
    : null;

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(db)); }, [db]);

  // Refresh recurring entries once when the page loads with a live session.
  useEffect(() => { if (me) setDb(s => applyToUser(s, () => {})); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Returns an error message, or null on success.
  const login = useCallback((email, password) => {
    const em = email.trim().toLowerCase();
    if (!db.users[em] || db.users[em].pw !== password) return 'Email or password is incorrect';
    setDb(s => applyToUser({ ...s, session: { email: em } }, () => {}));
    return null;
  }, [db]);

  // Returns an error message, or null on success.
  const register = useCallback(({ name, email, password, demo }) => {
    const em = email.trim().toLowerCase();
    if (db.users[em]) return 'An account with that email already exists';
    const user = { email: em, name: name.trim(), pw: password, d: newData(!!demo) };
    setDb(s => applyToUser({ ...s, users: { ...s.users, [em]: user }, session: { email: em } }, () => {}));
    return null;
  }, [db]);

  const hasAccount = useCallback(email => Boolean(db.users[email.trim().toLowerCase()]), [db]);

  const resetPassword = useCallback((email, password) => {
    const em = email.trim().toLowerCase();
    setDb(s => (s.users[em]
      ? { ...s, users: { ...s.users, [em]: { ...s.users[em], pw: password } } }
      : s));
  }, []);

  const logout = useCallback(() => setDb(s => ({ ...s, session: null })), []);

  // Permanently removes the signed-in account and all of its data.
  const deleteAccount = useCallback(() => {
    const email = me?.email;
    setDb(s => {
      const next = structuredClone(s);
      if (email) delete next.users[email];
      next.session = null;
      return next;
    });
  }, [me]);

  // Changes the signed-in user's data, e.g. updateData(d => { d.tx.push(entry); }).
  const updateData = useCallback(fn => setDb(s => applyToUser(s, fn)), []);

  const value = useMemo(() => ({
    me, login, register, hasAccount, resetPassword, logout, deleteAccount, updateData,
  }), [me, login, register, hasAccount, resetPassword, logout, deleteAccount, updateData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
