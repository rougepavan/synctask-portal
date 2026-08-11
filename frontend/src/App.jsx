import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

// TODO: Replace with your actual Google OAuth Client ID from Google Cloud Console
// https://console.cloud.google.com/apis/credentials
// Set Authorized JavaScript Origins: http://localhost:5173
// Set Authorized Redirect URIs: http://localhost:5173
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1048793890823-r5bga89j5dvt6uvfj16mhq6b6j4vjq6p.apps.googleusercontent.com';

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
    if (currentPath !== '/login') {
      window.history.replaceState({}, '', '/login');
      return <Login navigate={navigate} />;
    }
    return <Login navigate={navigate} />;
  } else {
    // If authenticated, prevent visiting login/register/forgot-password
    if (currentPath === '/login' || currentPath === '/register' || currentPath === '/forgot-password') {
      window.history.replaceState({}, '', '/dashboard');
      return <Dashboard />;
    }
    return <Dashboard />;
  }
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <NavigationRouter />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
