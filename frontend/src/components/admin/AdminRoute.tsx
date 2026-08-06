import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { adminApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

type AuthState = 'loading' | 'authorized' | 'unauthorized';

export default function AdminRoute({ children }: Props) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (mounted) setState('unauthorized');
        navigate('/login', { replace: true });
        return;
      }

      try {
        // This will 403 if not in authorized_admins — backend enforces it
        await adminApi.dashboard();
        if (mounted) setState('authorized');
      } catch (err: any) {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
          await supabase.auth.signOut();
          if (mounted) setState('unauthorized');
          navigate('/login', { replace: true });
        } else {
          // Network error etc. — allow through, the API will error on specific actions
          if (mounted) setState('authorized');
        }
      }
    }

    checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (state === 'unauthorized') return null;

  return <>{children}</>;
}
