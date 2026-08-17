import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { adminApi } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [magicSent, setMagicSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel Environment Variables.');
      return;
    }

    setLoading(true);
    try {
      let authResult;
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMagicSent(true);
        return;
      } else {
        authResult = await supabase.auth.signInWithPassword({ email, password });
        if (authResult.error) throw authResult.error;
      }

      // Verify against authorized_admins via backend
      try {
        await adminApi.dashboard(); // This call will 403 if not in authorized_admins
      } catch (apiErr: any) {
        if (apiErr?.response?.status === 403) {
          // Sign out the Supabase session immediately
          await supabase.auth.signOut();
          toast.error('This account is not authorized to access the admin area.');
          return;
        }
        // Other errors (network/backend offline etc.) — still let through, will be caught in AdminRoute
      }

      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      if (msg === 'Failed to fetch' || msg.includes('Failed to fetch')) {
        toast.error('Unable to reach Supabase. Please verify VITE_SUPABASE_URL is correctly set in Vercel settings.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-[slide-up_0.6s_ease-out]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-amber-400 fill-amber-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary-800">Admin Login</h1>
          <p className="text-gray-400 text-sm mt-1">Narkadhai Admin Area</p>
        </div>

        {magicSent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="font-display text-xl font-bold text-primary-800 mb-2">Check your email</h3>
            <p className="text-gray-500 text-sm">We sent a magic link to <strong>{email}</strong>. Click it to log in.</p>
            <button onClick={() => setMagicSent(false)} className="mt-6 text-primary-600 text-sm hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                placeholder="admin@example.com"
                id="login-email"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    placeholder="Your password"
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="w-full bg-primary-700 hover:bg-primary-800 text-white py-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Logging in...</> : 'Log In'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
              className="w-full text-center text-primary-600 text-sm hover:underline"
            >
              {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Access restricted to authorized Narkadhai admins only.
        </p>
      </div>
    </div>
  );
}
