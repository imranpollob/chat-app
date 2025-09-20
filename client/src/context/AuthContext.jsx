import { useCallback, useEffect, useMemo, useState } from 'react';
import { setAuthToken } from '../api/httpClient';
import AuthContext from './AuthContext.js';

const STORAGE_KEY = 'chat-app-auth';

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ user: null, token: null, loading: true });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.token) {
          setAuthToken(parsed.token);
          setState({ user: parsed.user, token: parsed.token, loading: false });
          return;
        }
      } catch (error) {
        console.error('Failed to parse stored auth data', error);
      }
    }
    setAuthToken(null);
    setState({ user: null, token: null, loading: false });
  }, []);

  const login = useCallback(({ user, token }) => {
    setAuthToken(token);
    setState({ user, token, loading: false });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setState({ user: null, token: null, loading: false });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      loading: state.loading,
      isAuthenticated: Boolean(state.token),
      login,
      logout
    }),
    [state, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
