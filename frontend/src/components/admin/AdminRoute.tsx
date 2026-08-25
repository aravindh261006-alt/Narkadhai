import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { adminApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LoginPage from '../../pages/LoginPage';

interface Props {
  children: ReactNode;
}

type AuthState = 'loading' | 'authorized' | 'unauthorized';

export default function AdminRoute({ children }: Props) {
  const [state, setState] = useState<AuthState>('loading');

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

        // Verify against authorized_admins via backend
        try {
          await adminApi.dashboard();
          if (mounted) setState('authorized');
        } catch (err: any) {
          if (err?.response?.status === 403) {
            await supabase.auth.signOut();
            toast.error('This account is not authorized to access the admin area.');
            if (mounted) {
              setState('unauthorized');
            }
          } else {
            // Network error, backend waking up, etc. — allow through to admin area
            if (mounted) setState('authorized');
          }
        }
      } catch (e) {
        console.error('[AdminRoute Auth Error]', e);
        if (mounted) setState('authorized');
      }
    }

    checkAuth();

    // Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || (session && event !== 'SIGNED_OUT')) {
        checkAuth();
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        if (mounted) {
          setState('unauthorized');
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

  if (state === 'unauthorized') {
    return <LoginPage onLoginSuccess={() => setState('authorized')} />;
  }

  return <>{children}</>;
}
