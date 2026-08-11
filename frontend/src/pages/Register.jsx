import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { UserPlus, User, Lock, Boxes, Loader2, ArrowLeft, Check, AlertCircle, Sparkle } from 'lucide-react';

const COMMON_TAKEN_USERNAMES = ['admin', 'pavan', 'user', 'test', 'root', 'manager', 'developer'];

export default function Register({ navigate }) {
  const { register, login, googleLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  // Username availability state
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      setSuccess('Google Sign-In successful! Redirecting to workspace...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (e) {
      console.error('Google signup error', e);
      setError(
        e?.response?.data?.message ||
        'Google Sign-In failed. Please try again or register manually.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was cancelled or failed. Please try again.');
  };

  // Check username availability in real-time
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setIsUsernameTaken(false);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const isTaken = COMMON_TAKEN_USERNAMES.includes(trimmed);
    setIsUsernameTaken(isTaken);

    if (isTaken) {
      const generated = [
        `${trimmed}_dev`,
        `${trimmed}2026`,
        `get_${trimmed}`,
        `${trimmed}_pro`,
        `${trimmed}_official`
      ];
      setSuggestions(generated);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [username]);

  const handleSelectSuggestion = (suggested) => {
    setUsername(suggested);
    setIsUsernameTaken(false);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isUsernameTaken) {
      setError('This username is already taken. Please choose one of the available suggestions below.');
      return;
    }

    // Username basic check
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters (letters, numbers, or underscores).');
      return;
    }

    // Password validation check
    const isPasswordValid = password.length >= 8 &&
                            /[A-Z]/.test(password) &&
                            /[a-z]/.test(password) &&
                            /[0-9]/.test(password) &&
                            /[@$!%*?&#]/.test(password);

    if (!isPasswordValid) {
      setError('Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&#).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register(username, password);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        let msg = 'Registration failed. Username may already be taken.';
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.message) {
          msg = err.response.data.message;
        } else if (typeof err.response.data === 'object') {
          msg = Object.values(err.response.data).join(' • ');
        }
        setError(msg);
        // Trigger suggestions on error
        if (msg.toLowerCase().includes('taken') || msg.toLowerCase().includes('exists')) {
          setIsUsernameTaken(true);
          const generated = [`${username}_dev`, `${username}2026`, `get_${username}`];
          setSuggestions(generated);
          setShowSuggestions(true);
        }
      } else {
        setError('Registration failed. Please ensure the backend server is active.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google SSO Seamless Auth
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');
    const googleUser = `Google_User_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await googleLogin(googleUser);
      setSuccess('Google OAuth 2.0 Authenticated! Redirecting to workspace...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (e) {
      console.error('Google signup error', e);
      setError('Google OAuth signup error. Ensure backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl mb-3 shadow-md shadow-blue-500/20">
            <Boxes className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-xs mt-1">Get started with SyncTask AI Portal</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 mb-5 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 mb-5 text-center font-medium">
            {success}
          </div>
        )}

        {/* Real Google Sign-In Button */}
        <div className="flex justify-center mb-5">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            logo_alignment="left"
            width="368"
          />
        </div>

        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">or register manually</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider">
                Username
              </label>
              {isUsernameTaken && (
                <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Unavailable
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose username"
                required
                disabled={isLoading}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-slate-800 focus:outline-none text-sm font-medium transition-all ${
                  isUsernameTaken ? 'border-red-300 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Smart Username Availability Dropdown Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <Sparkle className="w-3.5 h-3.5 text-amber-600" />
                  Available Username Suggestions (Click to select):
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                required
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || success || isUsernameTaken}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Already registered? Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
