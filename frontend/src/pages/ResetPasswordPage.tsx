import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Please check Vercel environment variables.');
      setCheckingSession(false);
      return;
    }

    let isMounted = true;

    // Parse URL hash for tokens or errors
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const error = hashParams.get('error') || searchParams.get('error');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

    if (error || errorDescription) {
      if (isMounted) {
        setErrorMessage(errorDescription || error || 'This reset link is invalid or has expired.');
        setCheckingSession(false);
      }
      return;
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    async function initSession() {
      // If tokens are in hash, explicitly set session
      if (accessToken && refreshToken) {
        try {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!setErr && isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
            return;
          }
        } catch (e) {
          console.warn('[ResetPassword] Error setting session from hash:', e);
        }
      }

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
        return;
      }

      // Give Supabase client a moment to parse hash automatically
      setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          setHasValidSession(true);
          setCheckingSession(false);
        } else {
          setHasValidSession(false);
          setCheckingSession(false);
          setErrorMessage('No active reset session found. Please request a new password reset link.');
        }
      }, 1200);
    }

    initSession();

    // Listen for auth events (e.g. PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED'))) {
        setHasValidSession(true);
        setCheckingSession(false);
        setErrorMessage(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Sign out after setting password so user logs in cleanly with new password
      await supabase.auth.signOut();

      setSuccess(true);
      toast.success('Password updated successfully! Please log in with your new password.');

      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-[slide-up_0.6s_ease-out]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#D4A017] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#D4A017]/25">
            <Heart className="w-7 h-7 text-[#2C1810] fill-[#2C1810]" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary-800">Set New Password</h1>
          <p className="text-gray-400 text-sm mt-1">Narkadhai Admin Security</p>
        </div>

        {checkingSession ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-600">Verifying your reset link...</p>
          </div>
        ) : errorMessage && !hasValidSession ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-gray-800 mb-1">Reset Link Expired or Invalid</h3>
              <p className="text-gray-500 text-sm">{errorMessage}</p>
            </div>
            <div className="pt-2">
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#D4A017] hover:bg-[#b88510] text-[#2C1810] py-3.5 px-4 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#D4A017]/20"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Login
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-gray-800 mb-1">Password Changed!</h3>
              <p className="text-gray-500 text-sm">Your new password is set. Redirecting to login...</p>
            </div>
            <div className="pt-2">
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-2 w-full bg-primary-700 hover:bg-primary-800 text-white py-3.5 px-4 rounded-xl font-semibold text-sm transition-all"
              >
                Go to Login Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  placeholder="At least 6 characters"
                  id="reset-password-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                placeholder="Re-enter your new password"
                id="confirm-password-input"
              />
            </div>

            {password && confirmPassword && (
              <div className={`text-xs flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-600' : 'text-amber-600'}`}>
                <KeyRound className="w-3.5 h-3.5" />
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match yet'}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              id="reset-password-submit"
              className="w-full bg-[#D4A017] hover:bg-[#b88510] text-[#2C1810] py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#D4A017]/25"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin text-[#2C1810]" /> Setting password...</> : 'Set New Password & Continue'}
            </button>

            <div className="text-center pt-2">
              <Link to="/admin" className="text-primary-600 hover:text-primary-800 text-xs font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
