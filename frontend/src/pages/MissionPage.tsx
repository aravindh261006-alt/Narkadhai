import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { settingsApi } from '../lib/api';
import type { Settings } from '../types';

export default function MissionPage() {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Our Purpose</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Mission & Vision</h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full" />
      </div>

      <div className="bg-gradient-to-br from-primary-800 to-primary-700 text-white rounded-3xl p-8 md:p-12 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <Compass className="w-10 h-10 text-amber-400 mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-primary-100 text-lg leading-relaxed whitespace-pre-wrap">
            {settings.mission_text ||
              'Narkadhai is an informal initiative that visits children\'s homes and old-age homes, collecting voluntary donations to support them. We believe in radical transparency — every rupee is accounted for and our books are open.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm">
          <h3 className="font-display text-xl font-bold text-primary-700 mb-3">What We Stand For</h3>
          <ul className="space-y-3 text-gray-600">
            {[
              'Radical transparency in every rupee spent',
              'Personal, on-the-ground connection with homes',
              'Voluntary, pressure-free giving',
              'Honest communication about our non-certified status',
            ].map((v, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">✦</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm">
          <h3 className="font-display text-xl font-bold text-primary-700 mb-3">Our Vision</h3>
          <p className="text-gray-600 leading-relaxed">
            A community where no home is forgotten. Where people give not because they're obliged, but because they've seen the impact with their own eyes. Where every contribution — big or small — is acknowledged and accounted for.
          </p>
        </div>
      </div>
    </div>
  );
}
