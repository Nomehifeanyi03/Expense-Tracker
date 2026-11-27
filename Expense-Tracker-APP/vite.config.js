import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle React up front, so the dev server doesn't re-optimize after the
    // page has loaded (that re-optimization is what leaves the browser asking for
    // a deps file that no longer exists).
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
});
