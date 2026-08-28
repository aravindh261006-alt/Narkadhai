import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, QrCode, Upload, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { settingsApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Settings } from '../../types';

const SETTING_FIELDS: { key: keyof Settings; label: string; type?: string; rows?: number }[] = [
  { key: 'donation_target_amount', label: 'Donation Target Amount (₹)', type: 'number' },
  { key: 'mission_text', label: 'Mission Text', rows: 5 },
  { key: 'about_text', label: 'About Text', rows: 5 },
  { key: 'instagram_url', label: 'Instagram Profile URL', type: 'url' },
  { key: 'instagram_handle', label: 'Instagram Handle (e.g. @narkadhai)' },
  { key: 'contact_email', label: 'Contact Email', type: 'email' },
  { key: 'owner_name', label: 'Owner Name' },
  { key: 'owner_bio', label: 'Owner Bio', rows: 3 },
  { key: 'owner_photo_url', label: 'Owner Photo URL' },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrFile2, setQrFile2] = useState<File | null>(null);
  const [uploadingQr2, setUploadingQr2] = useState(false);
  const [savingLabel1, setSavingLabel1] = useState(false);
  const [savingLabel2, setSavingLabel2] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const [k, v] of Object.entries(settings)) {
        if (v !== undefined) updates[k] = String(v);
      }
      await settingsApi.update(updates);
      toast.success('Settings saved!');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const handleQrUpload = async () => {
    if (!qrFile) return;
    if (qrFile.size > 524288000) {
      toast.error('File too large. Maximum size is 500MB');
      return;
    }
    setUploadingQr(true);
    try {
      const ext = qrFile.name.split('.').pop() || 'png';
      const path = `payment-qr-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('qr-codes').upload(path, qrFile, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(data.path);
      setSettings(prev => ({ ...prev, qr_code_url: publicUrl }));
      // Also save immediately
      await settingsApi.update({ qr_code_url: publicUrl });
      toast.success('Primary QR code uploaded & saved!');
      setQrFile(null);
    } catch (qrErr: any) {
      console.error('QR upload failed:', qrErr);
      toast.error(qrErr?.message || qrErr?.response?.data?.detail || 'QR upload failed. Check Supabase storage bucket & RLS policies.');
    } finally { setUploadingQr(false); }
  };

  const handleQrUpload2 = async () => {
    if (!qrFile2) return;
    if (qrFile2.size > 524288000) {
      toast.error('File too large. Maximum size is 500MB');
      return;
    }
    setUploadingQr2(true);
    try {
      const ext = qrFile2.name.split('.').pop() || 'png';
      const path = `payment-qr-backup-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('qr-codes').upload(path, qrFile2, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(data.path);
      setSettings(prev => ({ ...prev, qr_code_url_2: publicUrl }));
      await settingsApi.update({ qr_code_url_2: publicUrl });
      toast.success('Backup QR code uploaded & saved!');
      setQrFile2(null);
    } catch (qrErr: any) {
      console.error('Backup QR upload failed:', qrErr);
      toast.error(qrErr?.message || qrErr?.response?.data?.detail || 'Backup QR upload failed. Check Supabase storage bucket & RLS policies.');
    } finally { setUploadingQr2(false); }
  };

  const handleRemoveQr2 = async () => {
    try {
      setSettings(prev => ({ ...prev, qr_code_url_2: '' }));
      await settingsApi.update({ qr_code_url_2: '' });
      toast.success('Backup QR code removed');
    } catch (err: any) {
      toast.error('Failed to remove backup QR code');
    }
  };

  const handleSaveLabel1 = async () => {
    setSavingLabel1(true);
    try {
      await settingsApi.update({ qr_code_label_1: settings.qr_code_label_1 || '' });
      toast.success('Primary QR label saved!');
    } catch (err: any) {
      toast.error('Failed to save label');
    } finally {
      setSavingLabel1(false);
    }
  };

  const handleSaveLabel2 = async () => {
    setSavingLabel2(true);
    try {
      await settingsApi.update({ qr_code_label_2: settings.qr_code_label_2 || '' });
      toast.success('Backup QR label saved!');
    } catch (err: any) {
      toast.error('Failed to save label');
    } finally {
      setSavingLabel2(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="space-y-4">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-white rounded-xl animate-pulse" />)}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Edit site content, donation target, and configuration.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main settings */}
          <div className="lg:col-span-2 space-y-5">
            {SETTING_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                {field.rows ? (
                  <textarea
                    rows={field.rows}
                    value={settings[field.key] || ''}
                    onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-y"
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={settings[field.key] || ''}
                    onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  />
                )}
              </div>
            ))}

            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 bg-primary-700 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Settings</>}
            </button>
          </div>

          {/* QR Code Panels */}
          <div className="space-y-6">
            {/* Primary QR Code panel */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-800">Primary Payment QR</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Main QR code displayed on the donation page.</p>

              {/* Primary QR Label / Name */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  PRIMARY QR LABEL / NAME
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.qr_code_label_1 || ''}
                    onChange={e => setSettings(p => ({ ...p, qr_code_label_1: e.target.value }))}
                    placeholder="e.g. Primary QR (GPay)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                  />
                  <button
                    onClick={handleSaveLabel1}
                    disabled={savingLabel1}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {savingLabel1 ? '...' : 'Save'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Shown as the option name (e.g. "Primary QR (GPay)")
                </p>
              </div>

              {settings.qr_code_url ? (
                <img src={settings.qr_code_url} alt="Current QR" className="w-full max-w-[200px] mx-auto rounded-xl border border-gray-100 mb-4 shadow-xs" />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 mb-4">
                  <QrCode className="w-12 h-12 opacity-30" />
                </div>
              )}

              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary-300 transition-colors mb-3">
                <input type="file" accept="image/*" className="hidden" onChange={e => setQrFile(e.target.files?.[0] || null)} />
                {qrFile ? (
                  <p className="text-sm text-primary-600 truncate">📎 {qrFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Click to select primary QR</p>
                )}
              </label>

              <button onClick={handleQrUpload} disabled={!qrFile || uploadingQr}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-700 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-40 shadow-xs">
                {uploadingQr ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Primary QR</>}
              </button>
            </div>

            {/* Backup QR Code panel */}
            <div className="bg-white rounded-2xl p-6 border border-amber-100/80 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-800">Backup QR Code (Optional)</h3>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Shown if the primary QR doesn't work.
              </p>

              {/* Backup QR Label / Name */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Backup QR Label / Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.qr_code_label_2 || ''}
                    onChange={e => setSettings(p => ({ ...p, qr_code_label_2: e.target.value }))}
                    placeholder="e.g. GPay, PhonePe, Bank Transfer"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  />
                  <button
                    onClick={handleSaveLabel2}
                    disabled={savingLabel2}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {savingLabel2 ? '...' : 'Save'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Shown as the option name (e.g. "Backup QR (PhonePe)")
                </p>
              </div>

              {settings.qr_code_url_2 ? (
                <div className="relative mb-4">
                  <img src={settings.qr_code_url_2} alt="Backup QR" className="w-full max-w-[200px] mx-auto rounded-xl border border-amber-200 shadow-xs" />
                  <button
                    onClick={handleRemoveQr2}
                    className="mt-2 mx-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium py-1 px-2.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Backup QR
                  </button>
                </div>
              ) : (
                <div className="w-full h-36 bg-amber-50/50 border border-amber-100 rounded-xl flex flex-col items-center justify-center text-amber-400 mb-4">
                  <QrCode className="w-10 h-10 opacity-30 mb-1" />
                  <span className="text-xs text-gray-400">No backup QR configured</span>
                </div>
              )}

              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400 transition-colors mb-3">
                <input type="file" accept="image/*" className="hidden" onChange={e => setQrFile2(e.target.files?.[0] || null)} />
                {qrFile2 ? (
                  <p className="text-sm text-amber-600 truncate">📎 {qrFile2.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Click to select backup QR</p>
                )}
              </label>

              <button onClick={handleQrUpload2} disabled={!qrFile2 || uploadingQr2}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-40 shadow-xs">
                {uploadingQr2 ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Backup QR</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
