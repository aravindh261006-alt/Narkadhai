import { useEffect, useState } from 'react';
import DisclaimerBanner from '../components/ui/DisclaimerBanner';
import { settingsApi } from '../lib/api';
import type { Settings } from '../types';

export default function AboutPage() {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">About Us</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Who is Narkadhai?</h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full" />
      </div>

      <DisclaimerBanner variant="general" className="mb-10" />

      <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-xl text-gray-700 font-medium">
          {settings.about_text || 'Narkadhai was started by a group of friends who wanted to make a direct, tangible difference in their community.'}
        </p>

        <p>
          We visit children's homes and old-age homes — places that often go unnoticed — and try to understand what they truly need. Sometimes it's supplies, sometimes company, sometimes just the knowledge that someone cares.
        </p>

        <p>
          We collect voluntary donations from people who share our vision and channel them directly to the homes we visit. Every donation is tracked, every rupee is accounted for, and our community updates are shared openly.
        </p>

        <h2 className="font-display text-2xl font-bold text-primary-800 mt-8">How we work</h2>
        <ol className="space-y-3">
          {[
            'We identify a home that needs support and visit in person.',
            'We assess what the home needs most — supplies, funds, or simply time.',
            'We share our findings with the community and invite voluntary donations.',
            'We deliver the support and document everything with photos.',
            'We publish a financial statement of all funds received and spent.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-primary-700 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Owner section */}
      {settings.owner_name && (
        <div className="mt-16 bg-primary-50 rounded-2xl p-8 border border-primary-100">
          <h2 className="font-display text-2xl font-bold text-primary-800 mb-6">The Person Behind It</h2>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {settings.owner_photo_url && (
              <img
                src={settings.owner_photo_url}
                alt={settings.owner_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 flex-shrink-0"
              />
            )}
            <div>
              <h3 className="font-display text-xl font-bold text-primary-700 mb-2">{settings.owner_name}</h3>
              <p className="text-gray-600 leading-relaxed">{settings.owner_bio || 'Founder of the Narkadhai initiative.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
