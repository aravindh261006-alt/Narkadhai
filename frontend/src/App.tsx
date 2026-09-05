import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Public pages
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import MissionPage from './pages/MissionPage';
import MembersPage from './pages/MembersPage';
import AlbumsPage from './pages/AlbumsPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import DonatePage from './pages/DonatePage';
import ContactPage from './pages/ContactPage';

// Lazy-loaded Admin & Auth pages (isolated from public bundle)
const AdminRoute = lazy(() => import('./components/admin/AdminRoute'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminDonations = lazy(() => import('./pages/admin/AdminDonations'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminCommunityMessages = lazy(() => import('./pages/admin/AdminCommunityMessages'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminAlbums = lazy(() => import('./pages/admin/AdminAlbums'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAccess = lazy(() => import('./pages/admin/AdminAccess'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

function PageLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-primary-700">
      <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-600" />
      <p className="text-sm font-medium text-gray-500">Loading...</p>
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Wake up Render free tier backend automatically in background on app load
    fetch('https://narkadhai.onrender.com/api/health').catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif', borderRadius: '10px' },
            success: { iconTheme: { primary: '#1A4D3A', secondary: '#FAF7F2' } },
          }}
        />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/mission" element={<PublicLayout><MissionPage /></PublicLayout>} />
            <Route path="/members" element={<PublicLayout><MembersPage /></PublicLayout>} />
            <Route path="/albums" element={<PublicLayout><AlbumsPage /></PublicLayout>} />
            <Route path="/albums/:id" element={<PublicLayout><AlbumDetailPage /></PublicLayout>} />
            <Route path="/donate" element={<PublicLayout><DonatePage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />

            {/* Login & Password Reset */}
            <Route path="/login" element={<Navigate to="/admin" replace />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Admin (protected & lazy-loaded) */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/donations" element={<AdminRoute><AdminDonations /></AdminRoute>} />
            <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
            <Route path="/admin/community-messages" element={<AdminRoute><AdminCommunityMessages /></AdminRoute>} />
            <Route path="/admin/members" element={<AdminRoute><AdminMembers /></AdminRoute>} />
            <Route path="/admin/albums" element={<AdminRoute><AdminAlbums /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/admins" element={<AdminRoute><AdminAccess /></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
