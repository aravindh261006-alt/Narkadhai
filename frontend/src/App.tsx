import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { supabase } from './lib/supabase';

// Public pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import MissionPage from './pages/MissionPage';
import MembersPage from './pages/MembersPage';
import AlbumsPage from './pages/AlbumsPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import AuditPage from './pages/AuditPage';
import DonatePage from './pages/DonatePage';
import ContactPage from './pages/ContactPage';

// Auth & Admin
import LoginPage from './pages/LoginPage';
import AdminRoute from './components/admin/AdminRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDonations from './pages/admin/AdminDonations';
import AdminMembers from './pages/admin/AdminMembers';
import AdminAlbums from './pages/admin/AdminAlbums';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAccess from './pages/admin/AdminAccess';
import ResetPasswordPage from './pages/ResetPasswordPage';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/**
 * Automatically catches Supabase password recovery / invite tokens in the URL
 * or auth state and redirects to /reset-password so users never see a blank page or default home.
 */
function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    const isRecoveryOrInvite =
      hash.includes('type=recovery') ||
      hash.includes('type=invite') ||
      search.includes('type=recovery') ||
      search.includes('type=invite') ||
      hash.includes('access_token=');

    if (isRecoveryOrInvite && location.pathname !== '/reset-password') {
      navigate(`/reset-password${hash}${search}`, { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirectHandler />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', borderRadius: '10px' },
          success: { iconTheme: { primary: '#1A4D3A', secondary: '#FAF7F2' } },
        }}
      />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/mission" element={<PublicLayout><MissionPage /></PublicLayout>} />
        <Route path="/members" element={<PublicLayout><MembersPage /></PublicLayout>} />
        <Route path="/albums" element={<PublicLayout><AlbumsPage /></PublicLayout>} />
        <Route path="/albums/:id" element={<PublicLayout><AlbumDetailPage /></PublicLayout>} />
        <Route path="/audit" element={<PublicLayout><AuditPage /></PublicLayout>} />
        <Route path="/donate" element={<PublicLayout><DonatePage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />

        {/* Login & Password Reset */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin (protected) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/donations" element={<AdminRoute><AdminDonations /></AdminRoute>} />
        <Route path="/admin/members" element={<AdminRoute><AdminMembers /></AdminRoute>} />
        <Route path="/admin/albums" element={<AdminRoute><AdminAlbums /></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/admins" element={<AdminRoute><AdminAccess /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
