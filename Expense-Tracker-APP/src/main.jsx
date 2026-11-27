import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';

// Finds the empty <div id="root"> in index.html and draws the app inside it.
// AuthProvider wraps everything, so every screen can read who is signed in.
createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
