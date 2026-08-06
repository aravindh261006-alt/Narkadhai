import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Camera, ChevronRight, X, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { albumsApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import type { Album, AlbumWithPhotos } from '../../types';

export default function AdminAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<AlbumWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ home_name: '', visit_date: '', description: '' });

  const load = () => albumsApi.list().then(setAlbums).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const loadAlbum = (id: string) => albumsApi.get(id).then(setSelected).catch(() => {});

  const handleCreate = async () => {
    if (!newAlbum.home_name || !newAlbum.visit_date) return toast.error('Home name and visit date are required');
    setCreating(true);
    try {
      await albumsApi.create(newAlbum);
      toast.success('Album created');
      setShowCreate(false);
      setNewAlbum({ home_name: '', visit_date: '', description: '' });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create');
    } finally { setCreating(false); }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!confirm('Delete this album and all its photos?')) return;
    try {
      await albumsApi.delete(id);
      toast.success('Album deleted');
      setSelected(null);
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handlePhotoUpload = async (albumId: string, file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${albumId}/${Date.now()}.${ext}`;
      const { data: uploadData, error } = await supabase.storage.from('album-photos').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(uploadData.path);
      await albumsApi.addPhoto(albumId, { photo_url: publicUrl, caption: '' });
      toast.success('Photo added');
      loadAlbum(albumId);
    } catch { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const handleDeletePhoto = async (albumId: string, photoId: string) => {
    try {
      await albumsApi.deletePhoto(albumId, photoId);
      toast.success('Photo removed');
      loadAlbum(albumId);
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Albums</h1>
            <p className="text-gray-500 text-sm mt-1">Manage photo albums from home visits.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" /> New Album
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Album list */}
          <div className="md:col-span-1 space-y-3">
            {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />) :
              albums.length === 0 ? <p className="text-gray-400 text-sm">No albums yet.</p> :
              albums.map(a => (
                <button key={a.id} onClick={() => loadAlbum(a.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${selected?.id === a.id ? 'bg-primary-50 border-primary-300' : 'bg-white border-gray-100 hover:border-primary-200'}`}>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{a.home_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(a.visit_date)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))
            }
          </div>

          {/* Album detail */}
          <div className="md:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select an album to manage its photos</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-gray-800">{selected.home_name}</h3>
                    <p className="text-xs text-gray-400">{formatDate(selected.visit_date)} · {selected.photos.length} photo{selected.photos.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => handleDeleteAlbum(selected.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload area */}
                <label className="block mb-4 cursor-pointer border-2 border-dashed border-primary-200 rounded-xl p-4 text-center hover:border-primary-400 transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={async e => {
                      const files = Array.from(e.target.files || []);
                      for (const f of files) await handlePhotoUpload(selected.id, f);
                    }} />
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2 text-primary-600 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
                  ) : (
                    <span className="text-primary-600 text-sm">📷 Click to add photos</span>
                  )}
                </label>

                {/* Photos grid */}
                {selected.photos.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No photos yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {selected.photos.map(p => (
                      <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img src={p.photo_url} alt={p.caption || ''} className="w-full h-full object-cover" />
                        <button onClick={() => handleDeletePhoto(selected.id, p.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create album modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-4">New Album</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Name *</label>
                <input value={newAlbum.home_name} onChange={e => setNewAlbum(p => ({ ...p, home_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm" placeholder="Name of the home visited" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                <input type="date" value={newAlbum.visit_date} onChange={e => setNewAlbum(p => ({ ...p, visit_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={newAlbum.description} onChange={e => setNewAlbum(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none" placeholder="Brief description of the visit" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} disabled={creating} className="flex-1 bg-primary-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Album'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
