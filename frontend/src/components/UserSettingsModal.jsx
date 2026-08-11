import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { X, User, Lock, Sparkles, Check, Loader2, KeyRound, SlidersHorizontal, Shield, Bell, Palette, Trash2, LogOut, Edit2 } from 'lucide-react';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences'
  
  // Profile customization state
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem('userAvatarColor') || 'from-blue-600 to-indigo-600');
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Preference states
  const [autoAi, setAutoAi] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState('MEDIUM');
  const [emailAlerts, setEmailAlerts] = useState(true);

  useEffect(() => {
    if (user?.username) {
      setEditedUsername(user.username);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSelectAvatarColor = (colorClass) => {
    setAvatarColor(colorClass);
    localStorage.setItem('userAvatarColor', colorClass);
    // Dispatch custom event to notify parent components
    window.dispatchEvent(new Event('avatarColorUpdated'));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');

    if (!editedUsername.trim()) {
      setProfileError('Username cannot be empty.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      if (editedUsername.trim() !== user?.username) {
        await authService.updateProfile(editedUsername.trim());
        // Update local session
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.username = editedUsername.trim();
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
      localStorage.setItem('userAvatarColor', avatarColor);
      window.dispatchEvent(new Event('avatarColorUpdated'));

      setProfileMsg(`Profile updated successfully! Notification email dispatched.`);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.message || 'Failed to update username. It may already be taken.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('⚠️ WARNING: Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      setIsDeletingAccount(true);
      try {
        await authService.deleteAccount();
        alert('Account deleted. A confirmation email has been dispatched.');
        logout();
      } catch (err) {
        console.error(err);
        alert('Failed to delete account. Please try again.');
      } finally {
        setIsDeletingAccount(false);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');

    if (newPassword !== confirmPassword) {
      setSecError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSecSuccess('Password updated successfully! Notification email dispatched.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setSecError(err.response?.data?.message || 'Failed to update password. Verify current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Account & Portal Settings</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Manage profile, avatar theme, security, and preferences</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Avatar
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            Security & Credentials
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'preferences'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI & Workflows
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {profileError}
                </div>
              )}
              {profileMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                  {profileMsg}
                </div>
              )}

              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center font-bold text-white text-xl shadow-md`}>
                  {user?.username?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{user?.username}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[11px] rounded-md">
                      {user?.roles?.[0]?.replace('ROLE_', '') || 'STANDARD USER'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">SyncTask Portal Member</span>
                  </div>
                </div>
              </div>

              {/* Edit Username Field */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  Edit Account Username
                </label>
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  placeholder="Enter new username"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              {/* Avatar Color Selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  Avatar Color Theme
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { label: 'Royal Blue', class: 'from-blue-600 to-indigo-600' },
                    { label: 'Purple Violet', class: 'from-violet-600 to-purple-600' },
                    { label: 'Emerald Green', class: 'from-emerald-600 to-teal-600' },
                    { label: 'Amber Orange', class: 'from-amber-500 to-orange-600' },
                    { label: 'Dark Midnight', class: 'from-slate-700 to-slate-900' }
                  ].map((c) => (
                    <button
                      key={c.class}
                      type="button"
                      onClick={() => handleSelectAvatarColor(c.class)}
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.class} flex items-center justify-center transition-all cursor-pointer ${
                        avatarColor === c.class ? 'ring-2 ring-blue-600 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {avatarColor === c.class && <Check className="w-4 h-4 text-white font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Profile & Avatar
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </form>
          )}

          {/* 2. Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {secError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {secError}
                </div>
              )}
              {secSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                  {secSuccess}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold">Current Password</label>
                  <a
                    href="/forgot-password"
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    Forgot current password? Reset via OTP
                  </a>
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter existing password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars (1 upper, 1 lower, 1 number, 1 special)"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Credentials...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-100">Auto AI Description Generator</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Automatically suggest task description & priority upon selecting template</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoAi}
                  onChange={(e) => setAutoAi(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-600" /> Real-Time Email Notifications
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Dispatch email alerts for security actions, updates, and logins</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Close Settings
          </button>
        </div>

      </div>
    </div>
  );
}
