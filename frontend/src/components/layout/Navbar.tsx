import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/mission', label: 'Mission' },
  { to: '/members', label: 'Members' },
  { to: '/albums', label: 'Albums' },
  { to: '/donate', label: 'Donate', highlight: true },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isLinkActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="sticky top-0 z-50 bg-primary-900 border-b border-primary-800/80 shadow-md text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link to="/" className="group flex items-center py-1" aria-label="Narkadhai Home">
            <img
              src="/LOGO_NEW_.png"
              alt="Narkadhai"
              loading="lazy"
              width={100}
              height={36}
              className="w-[85px] sm:w-[95px] md:w-[100px] h-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map(link => {
              const active = isLinkActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    link.highlight
                      ? 'bg-amber-500 text-primary-950 font-bold hover:bg-amber-400 shadow-sm ml-2'
                      : active
                      ? 'text-white bg-primary-700 font-semibold shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-primary-800/80 bg-primary-900 px-4 py-4 space-y-1.5 shadow-xl">
          {navLinks.map(link => {
            const active = isLinkActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  link.highlight
                    ? 'bg-amber-500 text-primary-950 font-bold shadow-sm'
                    : active
                    ? 'text-white bg-primary-700 font-semibold shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
