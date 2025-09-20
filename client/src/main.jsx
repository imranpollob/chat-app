import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ThemeProvider from './context/ThemeContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              'rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
            style: {
              padding: '12px 16px'
            }
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
