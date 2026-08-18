import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Loader2, CheckCircle } from 'lucide-react';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import { contactApi, settingsApi } from '../lib/api';
import type { Settings } from '../types';

interface ContactForm {
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot
}

export default function ContactPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactForm>();

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => { });
  }, []);

  const onSubmit = async (data: ContactForm) => {
    if (data.website) return;
    try {
      await contactApi.submit({
        name: data.name,
        email: data.email,
        message: data.message,
      });
      setSubmitted(true);
      reset();
      toast.success('Message sent!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send message. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="text-center mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Get In Touch</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Contact Us</h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary-100">
          {submitted ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-display text-2xl font-bold text-primary-800 mb-2">Message Sent!</h3>
              <p className="text-gray-500">We'll get back to you as soon as possible.</p>
              <button onClick={() => setSubmitted(false)} className="mt-6 text-primary-600 text-sm hover:underline">
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-primary-800 mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <input type="text" {...register('website')} className="hidden" tabIndex={-1} autoComplete="off" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    placeholder="Your name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    {...register('message', { required: 'Message is required', minLength: { value: 10, message: 'At least 10 characters' } })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none"
                    placeholder="Your message..."
                  />
                  {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-700 hover:bg-primary-800 text-white py-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-6">
          <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
            <h3 className="font-display text-xl font-bold text-primary-800 mb-4">Direct Contact</h3>
            <a
              href={`mailto:${settings.contact_email || 'support.narkadhai@gmail.com'}`}
              className="flex items-center gap-3 text-primary-700 hover:text-primary-900 transition-colors group"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <span className="font-medium">{settings.contact_email || 'support.narkadhai@gmail.com'}</span>
            </a>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h3 className="font-display text-xl font-bold text-gray-800 mb-4">Social</h3>
            <a
              href={settings.instagram_url || 'https://www.instagram.com/narkadhai'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-purple-700 hover:text-purple-900 transition-colors group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-200 to-pink-200 rounded-xl flex items-center justify-center">
                <InstagramIcon className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium">{settings.instagram_handle || '@narkadhai'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
