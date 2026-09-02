import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Users, BookOpen, Camera, MessageSquareQuote, Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsApi, albumsApi, communityMessagesApi } from '../lib/api';
import { formatDate, parseAlbumDescription } from '../lib/utils';
import type { Settings, Album, CommunityMessage } from '../types';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [albums, setAlbums] = useState<Album[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<CommunityMessage[]>([]);

  // Community message submission state
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formWebsite, setFormWebsite] = useState(''); // Honeypot
  const [submittingMsg, setSubmittingMsg] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsApi.get().then(setSettings).catch(() => {}),
      albumsApi.list().then((a: any) => setAlbums(Array.isArray(a) ? a.slice(0, 3) : [])).catch(() => setAlbums([])),
      communityMessagesApi.listApproved().then((msgs: any) => setApprovedMessages(Array.isArray(msgs) ? msgs : [])).catch(() => setApprovedMessages([])),
    ]);
  }, []);

  const handleCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formWebsite) return; // Honeypot
    if (!formName.trim() || !formMessage.trim()) {
      return toast.error('Please enter both your name and message');
    }

    setSubmittingMsg(true);
    try {
      await communityMessagesApi.submit({
        name: formName.trim(),
        message: formMessage.trim(),
      });
      setSubmittedSuccess(true);
      setFormName('');
      setFormMessage('');
      toast.success('Thank you! Your message has been submitted.');
    } catch (err: any) {
      console.error('Failed to submit message:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to submit message');
    } finally {
      setSubmittingMsg(false);
    }
  };

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
          <h1 className="flex justify-center items-center mb-6">
            <img
              src="/logo.png"
              alt="Narkadhai"
              className="w-[200px] sm:w-[225px] md:w-[240px] max-w-full h-auto object-contain mx-auto drop-shadow-md"
            />
          </h1>
          <p className="text-xl md:text-2xl text-primary-200 max-w-2xl mx-auto mb-10">
            {settings.mission_text?.split('.')[0] || 'An informal initiative connecting hearts with homes.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 bg-[#D4A017] hover:bg-[#b88510] text-[#2C1810] font-bold px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#D4A017]/25"
            >
              <Heart className="w-5 h-5 fill-[#2C1810]" /> Donate Now
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-[#FDFAF5] px-8 py-4 rounded-xl border border-white/20 transition-all font-medium"
            >
              Learn About Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

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
                      <img src={album.cover_photo_url} alt={album.home_name} loading="lazy" width={400} height={192} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-12 h-12 text-primary-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-primary-800 mb-1">{album.home_name}</h3>
                    <p className="text-xs text-gray-400">{formatDate(album.visit_date)}</p>
                    {(() => {
                      const cleanDesc = parseAlbumDescription(album.description).description;
                      return cleanDesc ? <p className="text-sm text-gray-500 mt-2 line-clamp-2">{cleanDesc}</p> : null;
                    })()}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Community Messages / Testimonials Section */}
        <section className="space-y-12">
          {/* Submission Form Card */}
          <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-primary-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative max-w-2xl mx-auto text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Community Wall
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Share Your Thoughts</h2>
              <p className="text-primary-200 text-sm md:text-base">
                Say something to the team, share your experience, or leave a warm message of encouragement for the homes we visit.
              </p>
            </div>

            <div className="relative max-w-xl mx-auto">
              {submittedSuccess ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 animate-[slide-up_0.3s_ease-out]">
                  <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <h3 className="font-display text-2xl font-bold text-white mb-2">Thank You!</h3>
                  <p className="text-primary-100 text-sm mb-6">
                    Your message has been received with gratitude and will appear on the wall once reviewed by our team.
                  </p>
                  <button
                    onClick={() => setSubmittedSuccess(false)}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-primary-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                  >
                    Send Another Thought
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCommunitySubmit} className="space-y-4">
                  {/* Honeypot field */}
                  <input
                    type="text"
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1 text-left">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm backdrop-blur-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1 text-left">
                      Your Message
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formMessage}
                      onChange={e => setFormMessage(e.target.value)}
                      placeholder="Write your thoughts, warm wishes, or feedback..."
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm leading-relaxed backdrop-blur-sm transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingMsg}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#D4A017] hover:bg-[#b88510] disabled:opacity-50 text-[#2C1810] font-bold py-3.5 px-6 rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-[#D4A017]/25 text-sm"
                  >
                    {submittingMsg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#2C1810]" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Share My Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Approved Community Messages Grid (PART C: only if messages exist) */}
          {Array.isArray(approvedMessages) && approvedMessages.length > 0 && (
            <div>
              <div className="text-center mb-8">
                <span className="text-xs text-primary-600 font-semibold uppercase tracking-widest">From the Community</span>
                <h3 className="font-display text-3xl font-bold text-primary-900 mt-1">What People Are Saying</h3>
                <div className="w-12 h-1 bg-amber-400 rounded-full mx-auto mt-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedMessages.map(msg => (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-sm shadow-inner">
                          {msg.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <MessageSquareQuote className="w-5 h-5 text-amber-500/60" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap italic">
                        "{msg.message}"
                      </p>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-primary-900">{msg.name}</span>
                      <span className="text-gray-400">{formatDate(msg.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

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
