import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

function NavigationRouter() {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-semibold tracking-wide text-slate-500">Initializing Portal...</span>
        </div>
      </div>
    );
  }

  // Guard routing logic
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <Register navigate={navigate} />;
    }
    if (currentPath === '/forgot-password') {
      return <ForgotPassword navigate={navigate} />;
    }
    return <Login navigate={navigate} />;
  } else {
    // If authenticated, render Dashboard
    return <Dashboard navigate={navigate} />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationRouter />
    </AuthProvider>
  );
}
