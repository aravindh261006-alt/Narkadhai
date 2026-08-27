import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { adminApi } from '../../lib/api';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import LoginPage from '../../pages/LoginPage';

interface Props {
  children: ReactNode;
}

type AuthState = 'loading' | 'authorized' | 'unauthorized' | 'denied';

export default function AdminRoute({ children }: Props) {
  const [state, setState] = useState<AuthState>('loading');
  const [deniedEmail, setDeniedEmail] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Give local session a quick retry in case storage is syncing right after login
          await new Promise(resolve => setTimeout(resolve, 300));
          const { data: { session: retrySession } } = await supabase.auth.getSession();

          if (!retrySession) {
            if (mounted) {
              setState('unauthorized');
            }
            return;
          }
        }

        const currentSession = session || (await supabase.auth.getSession()).data.session;
        const userEmail = currentSession?.user?.email;

        // Verify against authorized_admins via backend
        try {
          await adminApi.verifyAccess();
          if (mounted) setState('authorized');
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 403 || status === 401) {
            // Unauthorized admin: immediately sign out of Supabase Auth
            try {
              localStorage.removeItem('narkadhai_admin_role');
              await supabase.auth.signOut();
            } catch {}

            toast.error('Access Denied - You are not authorized to access this area');
            if (mounted) {
              setDeniedEmail(userEmail || '');
              setState('denied');
            }
            return;
          }

          // If backend had a connection or server error, do one quick retry
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await adminApi.verifyAccess();
            if (mounted) setState('authorized');
          } catch (retryErr: any) {
            if (retryErr?.response?.status === 403 || retryErr?.response?.status === 401) {
              try {
                localStorage.removeItem('narkadhai_admin_role');
                await supabase.auth.signOut();
              } catch {}
              toast.error('Access Denied - You are not authorized to access this area');
              if (mounted) {
                setDeniedEmail(userEmail || '');
                setState('denied');
              }
            } else {
              // Server offline / network failure: do NOT leak admin data
              console.error('[AdminRoute Verification Error]', retryErr);
              toast.error('Unable to verify admin authorization with the server. Please try again.');
              if (mounted) setState('unauthorized');
            }
          }
        }
      } catch (e) {
        console.error('[AdminRoute Auth Error]', e);
        if (mounted) setState('unauthorized');
      }
    }

    checkAuth();

    // Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || (session && event !== 'SIGNED_OUT')) {
        checkAuth();
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        if (mounted) {
          setState((prev) => (prev === 'denied' ? 'denied' : 'unauthorized'));
        }
      }
    });

    return () => {
      mounted = false;
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary-700 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-600">Verifying admin access...</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center animate-[slide-up_0.4s_ease-out]">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-medium rounded-xl p-4 mb-4 text-left">
            Access Denied - You are not authorized to access this area
          </div>
          <p className="text-gray-500 text-xs leading-relaxed mb-6">
            The account {deniedEmail ? <strong>({deniedEmail})</strong> : ''} is not authorized to access the Narkadhai admin dashboard. You have been automatically signed out. Please contact the owner if you require access.
          </p>
          <button
            onClick={() => setState('unauthorized')}
            className="w-full bg-primary-800 hover:bg-primary-900 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (state === 'unauthorized') {
    return <LoginPage onLoginSuccess={() => setState('authorized')} />;
  }

  return <>{children}</>;
}
