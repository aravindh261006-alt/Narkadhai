import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';

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
    <footer className="bg-primary-900 text-white border-t border-primary-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center mb-4 group"
              aria-label="Narkadhai Home"
            >
              <img
                src="/LOGO_NEW_.png"
                alt="Narkadhai"
                loading="lazy"
                width={120}
                height={44}
                className="w-[100px] sm:w-[110px] md:w-[120px] h-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <p className="text-primary-200/80 text-sm leading-relaxed max-w-sm">
              An initiative connecting hearts with homes. Visiting, caring, and supporting — one step at a time.
            </p>
          </div>

          {/* Quick links with navbar-matching active highlight */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-xs uppercase tracking-widest">Pages</h3>
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
                          ? 'bg-primary-700 text-white font-semibold shadow-xs'
                          : 'text-primary-200/80 hover:text-white hover:bg-white/10'
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
            <h3 className="font-semibold text-white mb-3 text-xs uppercase tracking-widest">Connect</h3>
            <div className="space-y-2">
              <a
                href="https://www.instagram.com/narkadhai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary-200/80 hover:text-white hover:bg-white/10 text-sm transition-all"
              >
                <InstagramIcon className="w-4 h-4 text-amber-400" />
                @narkadhai
              </a>
              <div>
                <a
                  href="mailto:narkadhai.official@gmail.com"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary-200/80 hover:text-white hover:bg-white/10 text-sm transition-all"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  narkadhai.official@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-800/80 mt-8 pt-8 flex items-center justify-center text-center">
          <p className="text-primary-300/60 text-xs">
            © {new Date().getFullYear()} Narkadhai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
