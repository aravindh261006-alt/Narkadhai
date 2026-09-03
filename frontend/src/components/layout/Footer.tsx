import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Logo from './Logo';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const footerNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/mission', label: 'Mission' },
  { to: '/members', label: 'Members' },
  { to: '/albums', label: 'Albums' },
  { to: '/donate', label: 'Donate' },
  { to: '/contact', label: 'Contact' },
];

export default function Footer() {
  const location = useLocation();

  const isLinkActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <footer className="bg-[#2C1810] text-[#FDFAF5] border-t border-[#D4A017]/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center mb-4 group"
            >
              <Logo size="md" inverted={true} />
            </Link>
            <p className="text-[#FDFAF5]/70 text-sm leading-relaxed max-w-sm">
              An initiative connecting hearts with homes. Visiting, caring, and supporting — one step at a time.
            </p>
          </div>

          {/* Quick links with navbar-matching active highlight */}
          <div>
            <h3 className="font-semibold text-[#D4A017] mb-3 text-xs uppercase tracking-widest">Pages</h3>
            <ul className="space-y-1.5">
              {footerNavLinks.map(link => {
                const active = isLinkActive(link.to);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#D4A017] text-[#2C1810] font-bold shadow-xs'
                          : 'text-[#FDFAF5]/80 hover:text-[#D4A017] hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-[#D4A017] mb-3 text-xs uppercase tracking-widest">Connect</h3>
            <div className="space-y-2">
              <a
                href="https://www.instagram.com/narkadhai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#FDFAF5]/80 hover:text-[#D4A017] hover:bg-white/5 text-sm transition-all"
              >
                <InstagramIcon className="w-4 h-4 text-[#D4A017]" />
                @narkadhai
              </a>
              <div>
                <a
                  href="mailto:narkadhai.official@gmail.com"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#FDFAF5]/80 hover:text-[#D4A017] hover:bg-white/5 text-sm transition-all"
                >
                  <Mail className="w-4 h-4 text-[#D4A017]" />
                  narkadhai.official@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D4A017]/15 mt-8 pt-8 flex items-center justify-center text-center">
          <p className="text-[#FDFAF5]/50 text-xs">
            © {new Date().getFullYear()} Narkadhai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
