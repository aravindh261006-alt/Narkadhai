import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Heart } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/mission', label: 'Mission' },
  { to: '/members', label: 'Members' },
  { to: '/albums', label: 'Albums' },
  { to: '/audit', label: 'Audit' },
  { to: '/donate', label: 'Donate', highlight: true },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <span className="font-display text-xl font-bold text-primary-800">Narkadhai</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  link.highlight
                    ? 'bg-primary-700 text-white hover:bg-primary-800 px-4'
                    : location.pathname === link.to
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-primary-700 hover:bg-primary-50 hover:text-primary-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-primary-700 hover:bg-primary-50"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/30 bg-white/90 backdrop-blur-md px-4 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                link.highlight
                  ? 'bg-primary-700 text-white'
                  : location.pathname === link.to
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-primary-700 hover:bg-primary-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
