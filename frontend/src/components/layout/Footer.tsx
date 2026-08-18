import { Link, useLocation } from 'react-router-dom';
import { Heart, Mail } from 'lucide-react';

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
    <footer className="bg-primary-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-full bg-primary-700 border border-amber-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <span className="font-display text-xl font-bold">Narkadhai</span>
            </Link>
            <p className="text-primary-300 text-sm leading-relaxed">
              An initiative connecting hearts with homes. Visiting, caring, and supporting — one step at a time.
            </p>
          </div>

          {/* Quick links with navbar-matching active highlight */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Pages</h3>
            <ul className="space-y-1.5">
              {footerNavLinks.map(link => {
                const active = isLinkActive(link.to);
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary-100 text-primary-800 font-semibold shadow-sm'
                          : 'text-primary-300 hover:text-white hover:bg-primary-800/60'
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
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Connect</h3>
            <div className="space-y-2">
              <a
                href="https://www.instagram.com/narkadhai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800/60 text-sm transition-all"
              >
                <InstagramIcon className="w-4 h-4" />
                @narkadhai
              </a>
              <div>
                <a
                  href="mailto:support.narkadhai@gmail.com"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800/60 text-sm transition-all"
                >
                  <Mail className="w-4 h-4" />
                  support.narkadhai@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-primary-400 text-xs">
            © {new Date().getFullYear()} Narkadhai. All rights reserved.
          </p>
          <Link to="/login" className="text-primary-500 hover:text-primary-300 text-xs transition-colors">
            Admin Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
