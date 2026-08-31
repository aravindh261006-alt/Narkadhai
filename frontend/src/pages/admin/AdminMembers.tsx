import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Upload,
  ChevronUp,
  ChevronDown,
  Users,
  Camera,
  Check
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { membersApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Member } from '../../types';

interface FormState {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
}

const emptyForm: FormState = {
  name: '',
  role: '',
  bio: '',
  photo_url: '',
};

const deleteStoragePhoto = async (photoUrl: string | null | undefined) => {
  if (!photoUrl) return;
  const marker = '/member-photos/';
  const idx = photoUrl.indexOf(marker);
  if (idx !== -1) {
    const rawPath = photoUrl.substring(idx + marker.length).split('?')[0];
    if (rawPath) {
      try {
        await supabase.storage.from('member-photos').remove([decodeURIComponent(rawPath)]);
      } catch (err) {
        console.warn('Could not remove photo from Supabase storage:', err);
      }
    }
  }
};

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = () =>
    membersApi
      .list()
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setMembers(list);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      name: m.name,
      role: m.role,
      bio: m.bio || '',
      photo_url: m.photo_url || '',
    });
    setShowModal(true);
  };

  const handlePhotoUpload = async (file: File) => {
    const MAX_FILE_SIZE = 524288000; // 500MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 500MB');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast('Note: This image is over 2MB. For best performance, use images under 2MB.', {
        icon: '⚠️',
        duration: 4000,
      });
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      const { data: uploadData, error } = await supabase.storage
        .from('member-photos')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(uploadData.path);

      const oldPhotoUrl = form.photo_url;
      setForm(prev => ({ ...prev, photo_url: publicUrl }));
      toast.success('Photo uploaded');

      // If replacing an existing photo from member-photos bucket, delete old one
      if (oldPhotoUrl && oldPhotoUrl !== publicUrl) {
        await deleteStoragePhoto(oldPhotoUrl);
      }
    } catch (uploadErr: any) {
      console.error('Photo upload failed:', uploadErr);
      toast.error(uploadErr?.message || 'Photo upload failed. Check Supabase storage bucket & RLS policies.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    const oldUrl = form.photo_url;
    setForm(prev => ({ ...prev, photo_url: '' }));
    if (oldUrl) {
      await deleteStoragePhoto(oldUrl);
    }
    toast.success('Photo removed');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.role.trim()) return toast.error('Role/Title is required');

    setSaving(true);
    try {
      if (editing) {
        await membersApi.update(editing.id, {
          name: form.name.trim(),
          role: form.role.trim(),
          bio: form.bio.trim(),
          photo_url: form.photo_url || null,
        });
        toast.success('Member updated');
      } else {
        await membersApi.create({
          name: form.name.trim(),
          role: form.role.trim(),
          bio: form.bio.trim(),
          photo_url: form.photo_url || null,
          display_order: members.length,
        });
        toast.success('Member added');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      console.error('Failed to save member:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string, photoUrl?: string | null) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await membersApi.delete(id);
      if (photoUrl) {
        await deleteStoragePhoto(photoUrl);
      }
      toast.success('Member deleted');
      load();
    } catch (err: any) {
      console.error('Failed to delete member:', err);
      toast.error('Failed to delete member');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;

    const currentMember = members[index];
    const targetMember = members[targetIndex];

    setMovingId(currentMember.id);

    // Optimistically update list order immediately
    const newMembers = [...members];
    newMembers[index] = targetMember;
    newMembers[targetIndex] = currentMember;

    const reordered = newMembers.map((m, idx) => ({ ...m, display_order: idx }));
    setMembers(reordered);

    try {
      // Update both swapped members with sequential display_order
      await Promise.all([
        membersApi.update(currentMember.id, { display_order: targetIndex }),
        membersApi.update(targetMember.id, { display_order: index }),
      ]);
    } catch (err) {
      console.error('Failed to reorder members:', err);
      toast.error('Failed to save order change');
      load(); // revert
    } finally {
      setMovingId(null);
    }
  };

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Members</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage team members displayed on the public page and arrange their display order.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : safeMembers.length === 0 ? (
          /* Empty State Requirement: "No members added yet. Click + Add Member to start." */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 p-8 shadow-xs">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium text-base mb-1">
              No members added yet. Click + Add Member to start.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Members will appear in order on the public /members page.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div>
        ) : (
          /* Members List */
          <div className="space-y-3">
            {safeMembers.map((m, index) => {
              const isFirst = index === 0;
              const isLast = index === safeMembers.length - 1;
              const isMoving = movingId === m.id;

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 flex items-center justify-between gap-3 sm:gap-5 transition-all hover:border-primary-200 ${
                    isMoving ? 'opacity-70 ring-2 ring-primary-300' : ''
                  }`}
                >
                  {/* Left: Reorder Arrows, Photo, Info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* UP and DOWN arrow buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={isFirst || movingId !== null}
                        className="p-1 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-700 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                        title={isFirst ? 'First member (cannot move up)' : 'Move UP ▲'}
                        aria-label="Move member up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={isLast || movingId !== null}
                        className="p-1 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-700 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                        title={isLast ? 'Last member (cannot move down)' : 'Move DOWN ▼'}
                        aria-label="Move member down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Profile Photo Thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-primary-100 border border-primary-200 flex-shrink-0 flex items-center justify-center text-primary-700 font-bold text-lg shadow-2xs">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{m.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Member Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {m.name}
                        </p>
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full flex-shrink-0">
                          {m.role}
                        </span>
                      </div>
                      {m.bio ? (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 sm:line-clamp-2">
                          {m.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 italic mt-0.5">No bio</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Edit & Delete buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold text-xs transition-colors shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.name, m.photo_url)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete member"
                      aria-label="Delete member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT MEMBER (4 FIELDS ONLY)            */}
      {/* ==================================================== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-[slide-up_0.25s_ease-out] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-gray-800">
                  {editing ? 'Edit Member' : 'Add Member'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editing ? 'Update member photo and information' : 'Add a new member to the team'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Fields Only: Photo, Name, Role, Bio */}
            <div className="space-y-5">
              {/* Field 1: Profile Photo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-primary-50 flex items-center justify-center text-primary-400 flex-shrink-0 shadow-xs">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 opacity-40" />
                    )}
                  </div>

                  {/* Upload / Replace Actions */}
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-all shadow-xs">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) await handlePhotoUpload(file);
                          if (e.target) e.target.value = '';
                        }}
                      />
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-gray-500" />
                          <span>{form.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                    </label>

                    {form.photo_url && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="block text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
                      >
                        Remove photo
                      </button>
                    )}

                    <p className="text-[11px] text-gray-500">
                      JPG, PNG, or WEBP. For best performance, use images under 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Field 2: Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm font-medium transition-all"
                />
              </div>

              {/* Field 3: Role / Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Role / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Founder, Volunteer Coordinator, Core Member"
                  value={form.role}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm font-medium transition-all"
                />
              </div>

              {/* Field 4: Bio */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Bio (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="A few words about their role, passion, or contributions to Narkadhai..."
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving Changes...' : (editing ? 'Save Changes' : 'Add Member')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
