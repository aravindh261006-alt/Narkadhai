import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Loader2, Upload } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { membersApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Member } from '../../types';

interface FormState {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  display_order: number;
}

const emptyForm: FormState = { name: '', role: '', bio: '', photo_url: '', display_order: 0 };

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => membersApi.list()
    .then(res => setMembers(Array.isArray(res) ? res : []))
    .catch(() => setMembers([]))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, role: m.role, bio: m.bio || '', photo_url: m.photo_url || '', display_order: m.display_order });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.role.trim()) return toast.error('Role is required');
    setSaving(true);
    try {
      if (editing) {
        await membersApi.update(editing.id, form);
        toast.success('Member updated');
      } else {
        await membersApi.create(form);
        toast.success('Member added');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      console.error('Failed to save member:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this member?')) return;
    try {
      await membersApi.delete(id);
      toast.success('Member deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Members</h1>
            <p className="text-gray-500 text-sm mt-1">Manage team members displayed on the public page.</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : safeMembers.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <p>No members added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeMembers.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-xl font-bold text-primary-600">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-14 h-14 rounded-full object-cover" />
                  ) : m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                  <p className="text-xs text-amber-600 font-medium">{m.role}</p>
                  {m.bio && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.bio}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-in form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setShowForm(false)}>
          <div className="bg-white h-full w-full max-w-md p-8 overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold">{editing ? 'Edit Member' : 'Add Member'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="space-y-4">
              {([
                { key: 'name', label: 'Name *', placeholder: 'Full name' },
                { key: 'role', label: 'Role *', placeholder: 'e.g. Volunteer, Coordinator' },
                { key: 'bio', label: 'Bio', placeholder: 'Short bio (optional)' },
              ] as const).map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.key === 'bio' ? (
                    <textarea
                      rows={3}
                      value={form[field.key]}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={form[field.key] as string}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              {/* Photo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Photo</label>
                {form.photo_url ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 group">
                    <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, photo_url: '' }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const ext = file.name.split('.').pop() || 'jpg';
                          const path = `${Date.now()}.${ext}`;
                          const { data: uploadData, error } = await supabase.storage.from('member-photos').upload(path, file);
                          if (error) throw error;
                          const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(uploadData.path);
                          setForm(prev => ({ ...prev, photo_url: publicUrl }));
                          toast.success('Photo uploaded');
                        } catch (uploadErr: any) {
                          console.error('Photo upload failed:', uploadErr);
                          toast.error(uploadErr?.message || 'Photo upload failed. Check Supabase storage bucket & RLS policies.');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 font-medium">Click to upload photo</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" value={form.display_order}
                  onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm" />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-primary-700 text-white py-3.5 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save Member'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
