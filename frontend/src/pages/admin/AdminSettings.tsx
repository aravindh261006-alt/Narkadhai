import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, QrCode, Upload } from 'lucide-react';
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
      toast.error(err?.response?.data?.detail || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const handleQrUpload = async () => {
    if (!qrFile) return;
    setUploadingQr(true);
    try {
      const { data, error } = await supabase.storage.from('qr-codes').upload('payment-qr.png', qrFile, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(data.path);
      setSettings(prev => ({ ...prev, qr_code_url: publicUrl }));
      // Also save immediately
      await settingsApi.update({ qr_code_url: publicUrl });
      toast.success('QR code uploaded!');
      setQrFile(null);
    } catch { toast.error('QR upload failed'); } finally { setUploadingQr(false); }
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

          {/* QR Code panel */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Payment QR Code</h3>
            </div>

            {settings.qr_code_url ? (
              <img src={settings.qr_code_url} alt="Current QR" className="w-full max-w-[200px] mx-auto rounded-xl border border-gray-100 mb-4" />
            ) : (
              <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 mb-4">
                <QrCode className="w-12 h-12 opacity-30" />
              </div>
            )}

            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary-300 transition-colors mb-3">
              <input type="file" accept="image/*" className="hidden" onChange={e => setQrFile(e.target.files?.[0] || null)} />
              {qrFile ? (
                <p className="text-sm text-primary-600">📎 {qrFile.name}</p>
              ) : (
                <p className="text-sm text-gray-400">Click to select QR image</p>
              )}
            </label>

            <button onClick={handleQrUpload} disabled={!qrFile || uploadingQr}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary-700 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-40">
              {uploadingQr ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload QR</>}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center leading-relaxed">
              Upload the UPI QR code image that donors will scan. PNG or JPG recommended.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
