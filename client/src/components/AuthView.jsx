import { useState } from 'react';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { login, register } from '../api/auth';
import useAuth from '../hooks/useAuth';
import {
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const initialForm = { username: '', password: '' };

const AuthView = () => {
  const { login: authenticate } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Username and password are required');
      return;
    }

    setLoading(true);
    try {
      const action = mode === 'login' ? login : register;
      const response = await action(form);
      authenticate({ user: response.user, token: response.token });
      toast.success(response.message || 'Success');
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Inject keyframes for animated gradient
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes gradientMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div className="min-h-screen relative px-4 py-12 flex items-center justify-center overflow-hidden">
      {/* Animated color gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(120deg, #38bdf8, #6366f1, #0ea5e9, #f472b6, #a21caf)',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 16s ease-in-out infinite',
          opacity: 0.85,
          filter: 'blur(8px)',
        }}
      />
      {/* Glowing grid overlay */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-20">
          <defs>
            <linearGradient id="gridGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="url(#gridGradient)" strokeWidth="0.3" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i + 10} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="url(#gridGradient)" strokeWidth="0.3" />
          ))}
        </svg>
      </div>
      <div className="mx-auto w-full max-w-md border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/85 relative">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-16 w-16 text-brand-500" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Welcome to Chatie</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {mode === 'login'
              ? 'Sign in to continue where conversations never sleep.'
              : 'Create an account to start building communities and chatrooms.'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
              placeholder="Choose a unique handle"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
              placeholder="Enter a secure password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {mode === 'login' ? (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-brand-600 transition hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Register now
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-brand-600 transition hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthView;
