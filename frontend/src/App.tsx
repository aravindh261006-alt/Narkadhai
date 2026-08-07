import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

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

export default function App() {
  return (
    <BrowserRouter>
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

        {/* Login */}
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
