import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, IndianRupee, Users, Camera, Settings, LogOut, Shield, UserCircle, Mail, MessageSquareQuote } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/donations', label: 'Donations', icon: IndianRupee },
  { to: '/admin/messages', label: 'Contact Inquiries', icon: Mail },
  { to: '/admin/community-messages', label: 'Community Messages', icon: MessageSquareQuote },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/albums', label: 'Albums', icon: Camera },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/admins', label: 'Admin Access', icon: Shield },
  { to: '/admin/profile', label: 'My Account', icon: UserCircle },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<'owner' | 'audit' | null>(() => {
    try {
      return (localStorage.getItem('narkadhai_admin_role') as 'owner' | 'audit') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let mounted = true;
    adminApi.me()
      .then(user => {
        if (mounted && user?.role) {
          setRole(user.role);
          try {
            localStorage.setItem('narkadhai_admin_role', user.role);
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('narkadhai_admin_role');
    } catch {}
    await supabase.auth.signOut();
    toast.success('Logged out');
    navigate('/admin');
  };

  const filteredNavItems = navItems.filter(item => {
    // If navigating directly to or staying on /admin/admins, keep it stable
    if (item.to === '/admin/admins') {
      if (location.pathname === '/admin/admins') return true;
      if (role && role !== 'owner') return false;
      return true;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2C1810] text-[#FDFAF5] flex flex-col flex-shrink-0 border-r border-[#D4A017]/20">
        <div className="p-5 border-b border-[#D4A017]/15">
          <Link to="/" className="flex flex-col gap-1 group" aria-label="Narkadhai Admin Panel">
            <img
              src="/logo.png"
              alt="Narkadhai"
              className="w-[130px] h-auto max-h-10 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[#D4A017] text-[10px] font-bold tracking-widest uppercase pl-0.5">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {(Array.isArray(filteredNavItems) ? filteredNavItems : []).map(item => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#D4A017] text-[#2C1810] font-bold shadow-xs'
                    : 'text-[#FDFAF5]/80 hover:bg-white/5 hover:text-[#D4A017]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-800">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-primary-400 hover:text-white text-sm transition-colors mb-1">
            ← View Site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
