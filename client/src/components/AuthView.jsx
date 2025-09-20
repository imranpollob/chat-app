import { useState } from 'react';
import toast from 'react-hot-toast';
import { login, register } from '../api/auth';
import useAuth from '../hooks/useAuth';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-xs tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Realtime Collaboration
          </span>
          <h1 className="text-3xl font-semibold text-white">Welcome to NovaChat</h1>
          <p className="text-sm text-slate-400">
            {mode === 'login'
              ? 'Sign in to continue where conversations never sleep.'
              : 'Create an account to start building communities and chatrooms.'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition"
              placeholder="Choose a unique handle"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition"
              placeholder="Enter a secure password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 transition px-4 py-3 font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-brand-300 hover:text-brand-200"
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
                className="font-medium text-brand-300 hover:text-brand-200"
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
