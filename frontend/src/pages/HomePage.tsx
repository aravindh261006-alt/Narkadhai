import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Users, BookOpen, Camera } from 'lucide-react';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import DisclaimerBanner from '../components/ui/DisclaimerBanner';
import { settingsApi, albumsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { Settings, Album } from '../types';

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    Promise.all([
      settingsApi.get().then(setSettings).catch(() => {}),
      albumsApi.list().then((a: any) => setAlbums(Array.isArray(a) ? a.slice(0, 3) : [])).catch(() => setAlbums([])),
    ]);
  }, []);

  const instagramUrl = settings.instagram_url || 'https://www.instagram.com/narkadhai';
  const instagramHandle = settings.instagram_handle || '@narkadhai';

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-amber-300 text-sm font-medium mb-8 border border-white/20">
            <Heart className="w-4 h-4 fill-amber-300" />
            Visiting homes · Spreading care
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Narkadhai
          </h1>
          <p className="text-xl md:text-2xl text-primary-200 max-w-2xl mx-auto mb-4">
            {settings.mission_text?.split('.')[0] || 'An informal initiative connecting hearts with homes.'}
          </p>

          {/* Honest disclaimer in hero */}
          <p className="text-amber-300/90 text-sm mb-10 max-w-xl mx-auto">
            ⚠️ Narkadhai is <strong>not</strong> a certified or registered nonprofit. Donations are voluntary and not tax-exempt.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-primary-900 font-bold px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-500/20"
            >
              <Heart className="w-5 h-5" /> Donate Now
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl border border-white/20 transition-all"
            >
              Learn About Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* Disclaimer */}
        <DisclaimerBanner variant="general" />

        {/* Mission summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Heart, title: 'We Visit', desc: 'We personally visit children\'s homes and old-age homes to understand their needs.' },
            { icon: Users, title: 'We Connect', desc: 'Voluntary donors contribute directly to support the people at these homes.' },
            { icon: BookOpen, title: 'We Share', desc: 'Photos, stories, and donation progress from every visit are shared openly.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100 card-hover">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-primary-800 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

        {/* Latest albums preview */}
        {Array.isArray(albums) && albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-3xl font-bold text-primary-800">Latest Visits</h2>
                <p className="text-gray-500 text-sm mt-1">A glimpse of our recent home visits</p>
              </div>
              <Link to="/albums" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Array.isArray(albums) ? albums : []).map(album => (
                <Link key={album.id} to={`/albums/${album.id}`} className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-primary-100 card-hover">
                  <div className="h-48 bg-primary-100 overflow-hidden">
                    {album.cover_photo_url ? (
                      <img src={album.cover_photo_url} alt={album.home_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-12 h-12 text-primary-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-primary-800 mb-1">{album.home_name}</h3>
                    <p className="text-xs text-gray-400">{formatDate(album.visit_date)}</p>
                    {album.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{album.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Instagram section */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border border-purple-100">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <InstagramIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-3">Follow Us on Instagram</h2>
          <p className="text-gray-500 mb-2">See our visits, stories, and updates live on Instagram.</p>
          <p className="text-purple-600 font-semibold text-lg mb-6">{instagramHandle}</p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-md"
          >
            <InstagramIcon className="w-5 h-5" /> Follow {instagramHandle}
          </a>
        </section>

      </div>
    </div>
  );
}
