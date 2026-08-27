import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { QrCode, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { donationsApi, settingsApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Settings } from '../types';

interface DonationForm {
  donor_name: string;
  donor_email: string;
  amount: number;
  utr_or_txn_id?: string;
  payment_qr_used?: 'primary' | 'backup';
  website?: string; // honeypot
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function DonatePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DonationForm>({
    defaultValues: { payment_qr_used: 'primary' },
  });

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {});
  }, []);

  const onSubmit = async (data: DonationForm) => {
    // Honeypot check
    if (data.website) return;

    setSubmitState('submitting');
    try {
      const resp = await donationsApi.submit({
        donor_name: data.donor_name,
        donor_email: data.donor_email,
        amount: Number(data.amount),
        utr_or_txn_id: data.utr_or_txn_id || undefined,
        payment_qr_used: data.payment_qr_used || 'primary',
      });

      const donationId = resp.id;

      // Upload screenshot directly to Supabase Storage if provided
      if (screenshotFile && donationId) {
        try {
          setUploadProgress(true);
          const ext = screenshotFile.name.split('.').pop() || 'jpg';
          const path = `${donationId}/screenshot.${ext}`;
          const { data: uploadData, error } = await supabase.storage
            .from('donation-screenshots')
            .upload(path, screenshotFile, { upsert: true });

          if (!error && uploadData) {
            // Record the path so admin can retrieve with a signed URL later
            await donationsApi.recordScreenshot(donationId, uploadData.path);
          }
        } catch (e) {
          console.warn('Screenshot upload failed:', e);
        } finally {
          setUploadProgress(false);
        }
      }

      setSubmitState('success');
      reset({ payment_qr_used: 'primary' });
      setScreenshotFile(null);
      toast.success('Thank you! Your donation has been recorded.');
    } catch (err: any) {
      setSubmitState('error');
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409) {
        // Duplicate-submission detected by backend
        toast.error(detail || 'A donation with this email and amount was already submitted recently.');
      } else if (status === 429) {
        toast.error('Too many submissions. Please wait a while before trying again.');
      } else {
        toast.error(detail || 'Submission failed. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="text-center mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Support Narkadhai</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Donate</h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full mx-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: QR Code */}
        <div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary-100 text-center sticky top-24 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-primary-800 mb-2">Scan & Pay via UPI</h2>
              <p className="text-gray-500 text-sm mb-6">Use any UPI app — GPay, PhonePe, Paytm, etc.</p>
              {settings.qr_code_url ? (
                <img
                  src={settings.qr_code_url}
                  alt="UPI QR Code for Narkadhai donations"
                  className="max-w-[240px] mx-auto rounded-xl shadow-md border border-gray-100"
                />
              ) : (
                <div className="w-[240px] h-[240px] mx-auto bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                  <QrCode className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-400 text-sm text-center">QR code will appear here once uploaded by admin</p>
                </div>
              )}
            </div>

            {/* Backup QR if exists */}
            {settings.qr_code_url_2 && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs sm:text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3 mb-4 inline-block">
                  If the above QR doesn't work, try this:
                </p>
                <img
                  src={settings.qr_code_url_2}
                  alt={settings.qr_code_label_2 || "Backup QR Code"}
                  className="max-w-[210px] mx-auto rounded-xl shadow-md border border-amber-200 mb-3"
                />
                {settings.qr_code_label_2 && (
                  <p className="inline-block bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    {settings.qr_code_label_2}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">After paying, fill in the form to report your donation.</p>
          </div>
        </div>

        {/* Right: I've Donated form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary-100">
          <h2 className="font-display text-2xl font-bold text-primary-800 mb-2">I've Donated</h2>
          <p className="text-gray-500 text-sm mb-6">
            After completing your UPI payment, fill this form so we can record and verify your contribution.
          </p>

          {submitState === 'success' ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-display text-2xl font-bold text-primary-800 mb-2">Thank you!</h3>
              <p className="text-gray-500">Your donation has been recorded as pending. Our team will verify it shortly.</p>
              <button
                onClick={() => setSubmitState('idle')}
                className="mt-6 text-primary-600 text-sm hover:underline"
              >
                Submit another donation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Honeypot */}
              <input type="text" {...register('website')} className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  {...register('donor_name', { required: 'Name is required' })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  placeholder="Your name"
                />
                {errors.donor_name && <p className="text-red-500 text-xs mt-1">{errors.donor_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  {...register('donor_email', { required: 'Email is required' })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  placeholder="you@example.com"
                />
                {errors.donor_email && <p className="text-red-500 text-xs mt-1">{errors.donor_email.message}</p>}
                <p className="text-xs text-gray-400 mt-1">We'll send a thank-you email to this address.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Donated (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 1, message: 'Minimum donation is ₹1' },
                    max: { value: 1000000, message: 'Maximum per submission is ₹10,00,000. Contact us for larger contributions.' },
                    validate: v => Number.isInteger(Number(v)) || 'Please enter a whole rupee amount (no paise)',
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  placeholder="e.g. 500"
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
              </div>

              {/* Which QR did you use to pay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which QR did you use to pay?
                </label>
                <div className={`grid grid-cols-1 ${settings.qr_code_url_2 ? 'sm:grid-cols-2' : ''} gap-3`}>
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-primary-300 cursor-pointer transition-all bg-white has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50/50 has-[:checked]:ring-1 has-[:checked]:ring-primary-600">
                    <input
                      type="radio"
                      value="primary"
                      {...register('payment_qr_used')}
                      className="w-4 h-4 text-primary-700 focus:ring-primary-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800 block">Primary QR</span>
                      <span className="text-xs text-gray-400">Main payment QR code</span>
                    </div>
                  </label>

                  {settings.qr_code_url_2 && (
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-amber-400 cursor-pointer transition-all bg-white has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50/50 has-[:checked]:ring-1 has-[:checked]:ring-amber-600">
                      <input
                        type="radio"
                        value="backup"
                        {...register('payment_qr_used')}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 block">
                          Backup QR {settings.qr_code_label_2 ? `(${settings.qr_code_label_2})` : ''}
                        </span>
                        <span className="text-xs text-amber-600">Secondary QR code</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI Transaction / UTR ID (optional)</label>
                <input
                  {...register('utr_or_txn_id')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  placeholder="12-digit UTR or transaction ID"
                />
                <p className="text-xs text-gray-400 mt-1">Helps us verify faster.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot (optional)</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
                  />
                  {screenshotFile ? (
                    <p className="text-sm text-primary-600">📎 {screenshotFile.name}</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-400">Click to upload screenshot</p>
                      <p className="text-xs text-gray-300">JPG, PNG or PDF, max 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitState === 'submitting' || uploadProgress}
                className="w-full bg-primary-700 hover:bg-primary-800 text-white py-4 rounded-xl font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitState === 'submitting' || uploadProgress ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadProgress ? 'Uploading screenshot...' : 'Submitting...'}
                  </>
                ) : (
                  'Submit My Donation Report'
                )}
              </button>

              {submitState === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
