import { useEffect, useState } from 'react';
import { Compass, Sparkles } from 'lucide-react';
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

      <div className="bg-gradient-to-br from-primary-800 to-primary-700 text-white rounded-3xl p-8 md:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <Compass className="w-10 h-10 text-amber-400 mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-primary-100 text-lg leading-relaxed whitespace-pre-wrap">
            {settings.mission_text ||
              "Narkadhai is an initiative that visits children's homes and old-age homes, connecting compassionate people with homes in need to make a direct, tangible difference."}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-primary-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-primary-600" />
          <h3 className="font-display text-2xl font-bold text-primary-800">Our Vision</h3>
        </div>
        <p className="text-gray-600 leading-relaxed text-lg">
          A community where no home is forgotten. Where people give not because they're obliged, but because they've seen the impact with their own eyes. Where every contribution — big or small — brings warmth, care, and direct support to those who need it most.
        </p>
      </div>
    </div>
  );
}
