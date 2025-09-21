import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ThemeProvider from './context/ThemeContext.jsx';
import './index.css';

// Ensure relative time is available globally before any component renders
dayjs.extend(relativeTime);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
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
