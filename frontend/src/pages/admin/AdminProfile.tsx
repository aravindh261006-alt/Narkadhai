import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Lock, KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { AdminUser } from '../../types';

export default function AdminProfile() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Change Email State
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  const loadProfile = async () => {
    try {
      const me = await adminApi.me();
      setUser(me);
    } catch {
      toast.error('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      return toast.error('Please enter a valid email address');
    }
    if (newEmail.trim().toLowerCase() === user?.email.toLowerCase()) {
      return toast.error('New email must be different from current email');
    }

    setUpdatingEmail(true);
    try {
      const resp = await adminApi.changeEmail(newEmail.trim());
      toast.success(resp.message || 'Email updated successfully!');
      setNewEmail('');
      await loadProfile();
    } catch (err: any) {
      console.error('Email change error:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to update email');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setUpdatingPass(true);
    try {
      // 1. Update via backend service role
      await adminApi.changePassword(newPassword);
      // 2. Also sync with client Supabase session
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch {}

      toast.success('Password changed successfully! Keep it safe.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to update password');
    } finally {
      setUpdatingPass(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-4xl">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-white rounded-2xl animate-pulse" />
            <div className="h-64 bg-white rounded-2xl animate-pulse" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">My Account</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your login email and security credentials.</p>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-800">{user?.name}</h3>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  user?.role === 'owner' ? 'bg-primary-100 text-primary-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> {user?.email}
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Admin Session</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Change Email Box */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Change Email Address</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Update the email address associated with your admin account. You will use this new address to log in.
            </p>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Current Email</label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="your-new-email@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={updatingEmail || !newEmail}
                className="w-full bg-primary-700 hover:bg-primary-800 text-white py-3 rounded-xl font-medium text-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingEmail ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Updating email...</>
                ) : (
                  'Update Email Address'
                )}
              </button>
            </form>
          </div>

          {/* Change Password Box */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Change Password</h3>
            </div>

            <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">🛡️</span>
              <div>
                <p className="font-semibold text-amber-950">First-time login notice</p>
                <p className="mt-0.5 text-amber-900">
                  If you logged in using the default password (<strong>Narkadhai@2024</strong>), please set your own private password below to secure your admin access.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Choose a strong password with at least 6 characters to secure your admin account.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                />
              </div>

              {newPassword && confirmPassword && (
                <div className={`text-xs flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <KeyRound className="w-3.5 h-3.5" />
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match yet'}
                </div>
              )}

              <button
                type="submit"
                disabled={updatingPass || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full bg-primary-700 hover:bg-primary-800 text-white py-3 rounded-xl font-medium text-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingPass ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving password...</>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
