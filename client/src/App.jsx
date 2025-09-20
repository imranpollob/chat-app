import { useEffect } from 'react';
import toast from 'react-hot-toast';
import AuthView from './components/AuthView.jsx';
import ChatLayout from './components/ChatLayout.jsx';
import useAuth from './hooks/useAuth';

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast('Welcome! Please sign in to start chatting.');
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse text-sm tracking-wide uppercase">Preparing your workspace...</div>
      </div>
    );
  }

  return isAuthenticated ? <ChatLayout /> : <AuthView />;
};

export default App;
