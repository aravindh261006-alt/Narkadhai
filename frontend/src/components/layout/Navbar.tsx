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
    <nav className="sticky top-0 z-50 bg-[#2C1810] border-b border-[#D4A017]/20 shadow-md text-[#FDFAF5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="group flex items-center" aria-label="Narkadhai Home">
            <img
              src="/logo.png"
              alt="Narkadhai"
              className="w-[85px] sm:w-[95px] md:w-[100px] h-auto max-h-12 object-contain transition-transform group-hover:scale-105"
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
                      ? 'bg-[#D4A017] text-[#2C1810] font-bold hover:bg-[#b88510] shadow-sm ml-2'
                      : active
                      ? 'text-[#D4A017] bg-[#D4A017]/15 font-semibold'
                      : 'text-[#FDFAF5]/85 hover:text-[#D4A017] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#FDFAF5] hover:text-[#D4A017] hover:bg-white/5 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#D4A017]/20 bg-[#2C1810] px-4 py-4 space-y-1.5 shadow-xl">
          {navLinks.map(link => {
            const active = isLinkActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  link.highlight
                    ? 'bg-[#D4A017] text-[#2C1810] font-bold shadow-sm'
                    : active
                    ? 'text-[#D4A017] bg-[#D4A017]/15 font-semibold'
                    : 'text-[#FDFAF5]/85 hover:text-[#D4A017] hover:bg-white/5'
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
