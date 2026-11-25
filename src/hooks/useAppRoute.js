import { useCallback, useEffect, useState } from 'react';

// Keeps the address bar and the screen in step, so the browser's back and forward
// buttons move between screens. navigate(to) adds a history entry; pass
// { replace: true } to swap the current entry instead.
export function useAppRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (window.location.pathname === to) return;
    // `app: true` marks screens this app opened, so "Back to home" knows the entry
    // before it is the welcome page.
    const state = { app: to !== '/' };
    if (replace) window.history.replaceState(state, '', to);
    else window.history.pushState(state, '', to);
    setPath(to);
  }, []);

  return { path, navigate };
}
