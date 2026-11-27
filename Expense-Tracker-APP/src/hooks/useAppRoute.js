// useAppRoute.js
// Makes the browser's Back and Forward buttons work on the sign-in screens.
// Each screen has its own web address (for example /sign-in). When the address
// changes, the app shows the matching screen.

import { useEffect, useState } from 'react';

export function useAppRoute() {
  const [path, setPath] = useState(window.location.pathname);

  // When the user presses Back or Forward, update the screen to match the address.
  useEffect(() => {
    function handleBackOrForward() {
      setPath(window.location.pathname);
    }
    window.addEventListener('popstate', handleBackOrForward);
    return () => window.removeEventListener('popstate', handleBackOrForward);
  }, []);

  // Goes to a new address.
  // By default this adds a history entry, so the Back button can return here.
  // With { replace: true } it swaps the current entry instead.
  function navigate(to, options = {}) {
    if (window.location.pathname === to) return;
    // app: true means this app opened the page, so "Back to home" can use the Back button.
    const state = { app: to !== '/' };
    if (options.replace) window.history.replaceState(state, '', to);
    else window.history.pushState(state, '', to);
    setPath(to);
  }

  return { path, navigate };
}
