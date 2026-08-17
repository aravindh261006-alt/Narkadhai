import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, DollarSign, Users, Camera, FileText, Settings, LogOut, Shield } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/donations', label: 'Donations', icon: DollarSign },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/albums', label: 'Albums', icon: Camera },
  { to: '/admin/audit', label: 'Audit Docs', icon: FileText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/admins', label: 'Admin Access', icon: Shield },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<'owner' | 'audit' | null>(null);

  useEffect(() => {
    adminApi.me()
      .then(user => setRole(user.role))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.to === '/admin/admins' && role !== 'owner') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-primary-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-700 border border-amber-400/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <p className="font-display font-bold text-sm">Narkadhai</p>
              <p className="text-primary-400 text-xs">Admin Panel</p>
            </div>
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
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
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
