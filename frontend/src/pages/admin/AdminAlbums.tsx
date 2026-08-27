import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Camera,
  X,
  Loader2,
  Pencil,
  CheckCircle2,
  Check,
  ArrowLeft,
  ExternalLink,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../../components/admin/AdminLayout';
import { albumsApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatDate, parseAlbumDescription, formatAlbumDescription } from '../../lib/utils';
import type { Album, AlbumWithPhotos, AlbumPhoto } from '../../types';

interface SortablePhotoCardProps {
  photo: AlbumPhoto;
  index: number;
  isCurrentCover: boolean;
  onSetCover: (url: string) => void;
  onDelete: (id: string) => void;
}

function SortablePhotoCard({
  photo,
  index,
  isCurrentCover,
  onSetCover,
  onDelete,
}: SortablePhotoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVideo = photo.media_type === 'video' || /\.(mp4|mov|webm|avi)(\?.*)?$/i.test(photo.photo_url);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="aspect-square rounded-2xl border-2 border-dashed border-primary-500 bg-primary-50/70 flex flex-col items-center justify-center p-4 text-primary-600 transition-all shadow-inner select-none"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary-100/90 flex items-center justify-center text-primary-700 mb-2 shadow-xs">
          <span className="text-2xl leading-none select-none font-bold">⠿</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Drop Here</span>
        <span className="text-[11px] text-primary-500 mt-0.5 font-medium">Slot #{index + 1}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square rounded-2xl overflow-hidden shadow-xs border transition-all cursor-grab active:cursor-grabbing ${
        isCurrentCover
          ? 'ring-3 ring-emerald-500 border-emerald-500 shadow-md'
          : 'border-gray-200 hover:shadow-md bg-gray-900'
      }`}
    >
      {/* Media content */}
      {isVideo ? (
        <>
          <video
            src={photo.photo_url}
            className="w-full h-full object-cover pointer-events-none"
            preload="metadata"
            muted
            playsInline
          />
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none z-10">
            <span>▶</span> Video
          </div>
        </>
      ) : (
        <img
          src={photo.photo_url}
          alt={photo.caption || ''}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Top-Left: Cover Badge OR Set as Cover Button */}
      <div className="absolute top-2 left-2 z-20">
        {isCurrentCover ? (
          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Cover
          </span>
        ) : (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              onSetCover(photo.photo_url);
            }}
            className="inline-flex items-center gap-1 bg-black/60 hover:bg-emerald-600 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-xs shadow-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            title="Set as album cover photo"
          >
            <Check className="w-3 h-3" /> Set as Cover
          </button>
        )}
      </div>

      {/* Top-Right: Delete Media Button */}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation();
          onDelete(photo.id);
        }}
        className="absolute top-2 right-2 z-20 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete media"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Bottom-Right: Drag Handle badge with ⠿ icon */}
      <div
        className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 bg-black/75 hover:bg-primary-700 text-white text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl backdrop-blur-md shadow-md border border-white/20 select-none transition-all hover:scale-105 pointer-events-none"
        title="Drag to reorder"
      >
        <span className="text-base leading-none select-none font-bold">⠿</span>
        <span className="text-[10px] sm:text-[11px] font-medium select-none">#{index + 1}</span>
      </div>
    </div>
  );
}

function PhotoOverlayCard({
  photo,
  isCurrentCover,
}: {
  photo: AlbumPhoto;
  isCurrentCover: boolean;
}) {
  const isVideo = photo.media_type === 'video' || /\.(mp4|mov|webm|avi)(\?.*)?$/i.test(photo.photo_url);

  return (
    <div
      className={`relative aspect-square w-44 sm:w-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary-500 bg-gray-900 scale-105 cursor-grabbing select-none ${
        isCurrentCover ? 'ring-4 ring-emerald-500' : ''
      }`}
    >
      {isVideo ? (
        <>
          <video
            src={photo.photo_url}
            className="w-full h-full object-cover pointer-events-none"
            muted
            playsInline
          />
          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>▶</span> Video
          </div>
        </>
      ) : (
        <img
          src={photo.photo_url}
          alt={photo.caption || ''}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {isCurrentCover && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Cover
          </span>
        </div>
      )}

      <div className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 bg-primary-700 text-white text-xs font-semibold px-2.5 py-1 rounded-xl shadow-lg border border-white/20">
        <span className="text-base leading-none font-bold">⠿</span>
        <span className="text-[11px] font-medium">Moving</span>
      </div>
    </div>
  );
}

export default function AdminAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit view state (Settings page style)
  const [editingAlbum, setEditingAlbum] = useState<AlbumWithPhotos | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    home_name: '',
    visit_date: '',
    location: '',
    contact_number: '',
    description: '',
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Drag-and-drop state for photos
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAlbum, setNewAlbum] = useState({
    home_name: '',
    visit_date: '',
    location: '',
    contact_number: '',
    description: '',
  });

  const loadAlbums = () =>
    albumsApi
      .list()
      .then(res => setAlbums(Array.isArray(res) ? res : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadAlbums();
  }, []);

  const openEdit = async (albumId: string) => {
    setLoadingEdit(true);
    try {
      const albumData = await albumsApi.get(albumId);
      if (albumData) {
        const parsed = parseAlbumDescription(albumData.description);
        const photos = Array.isArray(albumData.photos) ? albumData.photos : [];
        photos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setEditingAlbum({
          ...albumData,
          photos,
        });
        setEditForm({
          home_name: albumData.home_name || '',
          visit_date: albumData.visit_date || '',
          location: parsed.location || '',
          contact_number: parsed.contact || '',
          description: parsed.description || '',
        });
        // Scroll smoothly to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to load album for editing:', err);
      toast.error('Failed to load album details');
    } finally {
      setLoadingEdit(false);
    }
  };

  const reloadEditingAlbum = async (albumId: string) => {
    try {
      const albumData = await albumsApi.get(albumId);
      if (albumData) {
        const photos = Array.isArray(albumData.photos) ? albumData.photos : [];
        photos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setEditingAlbum({
          ...albumData,
          photos,
        });
      }
    } catch (err) {
      console.error('Failed to reload editing album:', err);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActivePhotoId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePhotoId(null);

    if (!over || active.id === over.id || !editingAlbum) return;

    const oldIndex = editingAlbum.photos.findIndex(p => p.id === active.id);
    const newIndex = editingAlbum.photos.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousPhotos = [...editingAlbum.photos];
    const newPhotos = arrayMove(editingAlbum.photos, oldIndex, newIndex).map((p, idx) => ({
      ...p,
      display_order: idx,
    }));

    // Optimistically update local state immediately
    setEditingAlbum(prev => (prev ? { ...prev, photos: newPhotos } : null));
    setIsReordering(true);

    try {
      await albumsApi.reorderPhotos(
        editingAlbum.id,
        newPhotos.map((p, idx) => ({ id: p.id, display_order: idx }))
      );
      toast.success('Photo order saved', { id: 'photo-reorder-saved', duration: 1500 });
    } catch (err) {
      console.error('Failed to save photo order:', err);
      toast.error('Failed to save new photo order');
      setEditingAlbum(prev => (prev ? { ...prev, photos: previousPhotos } : null));
    } finally {
      setIsReordering(false);
    }
  };

  const handleCreate = async () => {
    if (!newAlbum.home_name || !newAlbum.visit_date) {
      return toast.error('Home name and visit date are required');
    }
    setCreating(true);
    try {
      const formattedDesc = formatAlbumDescription(
        newAlbum.location,
        newAlbum.contact_number,
        newAlbum.description
      );
      const created = await albumsApi.create({
        home_name: newAlbum.home_name,
        visit_date: newAlbum.visit_date,
        description: formattedDesc,
      });
      toast.success('Album created successfully');
      setShowCreate(false);
      setNewAlbum({ home_name: '', visit_date: '', location: '', contact_number: '', description: '' });
      await loadAlbums();
      if (created?.id) {
        await openEdit(created.id);
      }
    } catch (err: any) {
      console.error('Failed to create album:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to create album');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!editingAlbum) return;
    if (!editForm.home_name || !editForm.visit_date) {
      return toast.error('Home name and visit date are required');
    }
    setSavingDetails(true);
    try {
      const formattedDesc = formatAlbumDescription(
        editForm.location,
        editForm.contact_number,
        editForm.description
      );
      await albumsApi.update(editingAlbum.id, {
        home_name: editForm.home_name,
        visit_date: editForm.visit_date,
        description: formattedDesc,
      });
      toast.success('Album details saved!');
      await reloadEditingAlbum(editingAlbum.id);
      loadAlbums();
    } catch (err: any) {
      console.error('Failed to save album:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save changes');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSetCover = async (photoUrl: string) => {
    if (!editingAlbum) return;
    try {
      await albumsApi.update(editingAlbum.id, { cover_photo_url: photoUrl });
      setEditingAlbum(prev => prev ? { ...prev, cover_photo_url: photoUrl } : null);
      toast.success('Cover photo updated!');
      loadAlbums();
    } catch (err: any) {
      console.error('Failed to set cover photo:', err);
      toast.error('Failed to update cover photo');
    }
  };

  const handleDeleteAlbum = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the album "${name}" and all its photos?`)) return;
    try {
      await albumsApi.delete(id);
      toast.success('Album deleted');
      if (editingAlbum?.id === id) {
        setEditingAlbum(null);
      }
      loadAlbums();
    } catch (err: any) {
      console.error('Failed to delete album:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete album');
    }
  };

  const handleMediaUpload = async (file: File) => {
    if (!editingAlbum) return;
    const MAX_FILE_SIZE = 524288000; // 500MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 500MB');
      return;
    }

    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi)$/i.test(file.name);
      const mediaType = isVideo ? 'video' : 'image';
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${editingAlbum.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        if (/\.mp4$/i.test(file.name)) contentType = 'video/mp4';
        else if (/\.mov$/i.test(file.name)) contentType = 'video/quicktime';
        else if (/\.webm$/i.test(file.name)) contentType = 'video/webm';
        else if (/\.avi$/i.test(file.name)) contentType = 'video/avi';
        else if (/\.(jpg|jpeg)$/i.test(file.name)) contentType = 'image/jpeg';
        else if (/\.png$/i.test(file.name)) contentType = 'image/png';
        else if (/\.webp$/i.test(file.name)) contentType = 'image/webp';
        else if (/\.gif$/i.test(file.name)) contentType = 'image/gif';
      }

      const { data: uploadData, error } = await supabase.storage
        .from('album-photos')
        .upload(path, file, { contentType, upsert: true });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(uploadData.path);

      await albumsApi.addPhoto(editingAlbum.id, {
        photo_url: publicUrl,
        caption: '',
        media_type: mediaType,
        display_order: editingAlbum.photos?.length || 0,
      });
      toast.success(isVideo ? 'Video added' : 'Photo added');
      await reloadEditingAlbum(editingAlbum.id);
      loadAlbums();
    } catch (uploadErr: any) {
      console.error('Media upload failed:', uploadErr);
      const msg = uploadErr?.message || uploadErr?.response?.data?.detail || '';
      if (msg.includes('mime type') || msg.includes('not supported') || msg.includes('mime_type')) {
        toast.error('Video MIME type rejected by Supabase storage. Please run the SQL bucket update in Supabase.');
      } else {
        toast.error(msg || 'Upload failed. Check Supabase storage bucket & RLS policies.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (photoId: string) => {
    if (!editingAlbum) return;
    if (!confirm('Are you sure you want to delete this media item?')) return;
    try {
      await albumsApi.deletePhoto(editingAlbum.id, photoId);
      toast.success('Media removed');
      await reloadEditingAlbum(editingAlbum.id);
      loadAlbums();
    } catch {
      toast.error('Failed to remove media');
    }
  };

  const activePhoto = editingAlbum?.photos?.find(p => p.id === activePhotoId) || null;

  return (
    <AdminLayout>
      {loadingEdit && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3 text-primary-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold text-sm">Opening album...</span>
          </div>
        </div>
      )}
      <div className="p-6 sm:p-8 max-w-7xl mx-auto">
        {/* ==================================================== */}
        {/* SCREEN 1: EDIT ALBUM (SETTINGS-PAGE STYLE) */}
        {/* ==================================================== */}
        {editingAlbum ? (
          <div className="space-y-8 animate-[fade-in_0.2s_ease-out]">
            {/* Top Bar with Back navigation & Quick links */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingAlbum(null)}
                  className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-primary-700 hover:border-primary-300 hover:bg-primary-50 transition-all shadow-xs"
                  title="Back to all albums"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                      Edit Album
                    </span>
                    <span className="text-xs text-gray-400">· {editingAlbum.photos?.length || 0} media items</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                    {editingAlbum.home_name}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center">
                <Link
                  to={`/albums/${editingAlbum.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-primary-700 text-sm font-medium hover:bg-gray-50 transition-all shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" /> View on Site
                </Link>
                <button
                  onClick={() => handleDeleteAlbum(editingAlbum.id, editingAlbum.home_name)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Album
                </button>
              </div>
            </div>

            {/* FORM CARD: ALBUM DETAILS (Settings page style) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-gray-800">Album Information</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                    Update the home name, visit date, location, contact, and description.
                  </p>
                </div>
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs disabled:opacity-60"
                >
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingDetails ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Home Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.home_name}
                    onChange={e => setEditForm(prev => ({ ...prev, home_name: e.target.value }))}
                    placeholder="e.g. Hope Children's Home"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all text-gray-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Visit Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.visit_date}
                    onChange={e => setEditForm(prev => ({ ...prev, visit_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all text-gray-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Location (Place or Google Maps link)
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Chennai, Tamil Nadu or https://maps.app.goo.gl/..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Only shown inside the album detail page (not on album cards).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Contact Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.contact_number}
                    onChange={e => setEditForm(prev => ({ ...prev, contact_number: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Description / Bio
                  </label>
                  <textarea
                    rows={5}
                    value={editForm.description}
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Share notes, the story of the visit, needs identified, or children/elderly count..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    This description/bio appears cleanly on the album cards on the public Albums page.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs disabled:opacity-60"
                >
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingDetails ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* SECTION 2: PHOTO & VIDEO MANAGEMENT (Grid with Cover Photo Selection) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-gray-800">Photos & Videos</h2>
                    {isReordering && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full font-medium animate-pulse border border-primary-200">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving order...
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                    Drag photos using the <span className="font-bold text-gray-700">⠿</span> handle to reorder them. Changes save automatically. Click "Set as Cover" to choose the album cover.
                  </p>
                </div>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full self-start sm:self-auto">
                  {editingAlbum.photos?.length || 0} media file{editingAlbum.photos?.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Upload area */}
              <label className="block cursor-pointer border-2 border-dashed border-primary-200 hover:border-primary-400 hover:bg-primary-50/30 rounded-2xl p-6 sm:p-8 text-center transition-all">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/avi,.mp4,.mov,.webm,.avi"
                  multiple
                  className="hidden"
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    for (const f of files) await handleMediaUpload(f);
                    if (e.target) e.target.value = '';
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-primary-700">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-semibold text-sm">Uploading media files...</span>
                    <span className="text-xs text-gray-400">Please wait while files are safely stored</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-primary-700">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100/60 flex items-center justify-center text-primary-700">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-base">📷🎥 Click or Drag to Add Photos & Videos</span>
                    <span className="text-xs text-gray-400 max-w-md">
                      Supports JPG, PNG, WEBP, GIF, MP4, MOV, WEBM, AVI (up to 500MB each)
                    </span>
                  </div>
                )}
              </label>

              {/* Media Grid */}
              {(!editingAlbum.photos || editingAlbum.photos.length === 0) ? (
                <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No photos or videos in this album yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload images or videos above to build the visit gallery.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editingAlbum.photos.map(p => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {editingAlbum.photos.map((photo, index) => (
                        <SortablePhotoCard
                          key={photo.id}
                          photo={photo}
                          index={index}
                          isCurrentCover={editingAlbum.cover_photo_url === photo.photo_url}
                          onSetCover={handleSetCover}
                          onDelete={handleDeleteMedia}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay adjustScale={true}>
                    {activePhoto ? (
                      <PhotoOverlayCard
                        photo={activePhoto}
                        isCurrentCover={editingAlbum.cover_photo_url === activePhoto.photo_url}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* SCREEN 2: ALL ALBUMS LIST / TABLE                    */
          /* ==================================================== */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-gray-800">Albums</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage visit galleries, update details, and choose custom cover photos.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-800 transition-colors shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> New Album
              </button>
            </div>

            {/* Table Card (Settings Page aesthetic) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : albums.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Camera className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="text-base font-medium">No albums created yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "+ New Album" to record your first visit.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Cover</th>
                        <th className="py-3.5 px-4">Home Name</th>
                        <th className="py-3.5 px-4">Visit Date</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4">Description</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {albums.map(album => {
                        const parsed = parseAlbumDescription(album.description);
                        const isLocUrl = parsed.location && /^https?:\/\//i.test(parsed.location.trim());
                        const locMapUrl = parsed.location
                          ? (isLocUrl
                              ? parsed.location.trim()
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  parsed.location.trim()
                                ).replace(/%20/g, '+')}`)
                          : '';

                        return (
                          <tr key={album.id} className="hover:bg-primary-50/30 transition-colors group">
                            {/* Cover Thumbnail */}
                            <td className="py-3.5 px-5">
                              <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-100 border border-primary-200 flex-shrink-0 flex items-center justify-center">
                                {album.cover_photo_url ? (
                                  <img
                                    src={album.cover_photo_url}
                                    alt={album.home_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Camera className="w-5 h-5 text-primary-400 opacity-60" />
                                )}
                              </div>
                            </td>

                            {/* Home Name */}
                            <td className="py-3.5 px-4 font-semibold text-gray-900">
                              <button
                                onClick={() => openEdit(album.id)}
                                className="text-left hover:text-primary-700 transition-colors hover:underline font-display text-base"
                              >
                                {album.home_name}
                              </button>
                            </td>

                            {/* Visit Date */}
                            <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap text-xs sm:text-sm">
                              {formatDate(album.visit_date)}
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4 text-gray-600 text-xs sm:text-sm max-w-xs">
                              {parsed.location ? (
                                <a
                                  href={locMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-700 hover:underline inline-flex items-center gap-1 font-medium truncate max-w-[200px]"
                                  title={parsed.location}
                                >
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary-500" />
                                  <span className="truncate">{parsed.location}</span>
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            {/* Description / Bio Preview */}
                            <td className="py-3.5 px-4 text-gray-500 text-xs max-w-xs truncate">
                              {parsed.description ? (
                                <span className="line-clamp-1" title={parsed.description}>
                                  {parsed.description}
                                </span>
                              ) : (
                                <span className="text-gray-300 italic">No description</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => openEdit(album.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold text-xs transition-colors shadow-2xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <Link
                                  to={`/albums/${album.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-primary-700 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="View album on public site"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => handleDeleteAlbum(album.id, album.home_name)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete album"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: CREATE NEW ALBUM                              */}
      {/* ==================================================== */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl animate-[slide-up_0.25s_ease-out] my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-display text-2xl font-bold text-gray-800">New Album</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Record a new home visit and add photo & video memories
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Home Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hope Children's Home"
                  value={newAlbum.home_name}
                  onChange={e => setNewAlbum(p => ({ ...p, home_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Visit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newAlbum.visit_date}
                  onChange={e => setNewAlbum(p => ({ ...p, visit_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Location (Address or Google Maps link)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, Tamil Nadu or Google Maps link"
                  value={newAlbum.location}
                  onChange={e => setNewAlbum(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newAlbum.contact_number}
                  onChange={e => setNewAlbum(p => ({ ...p, contact_number: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description / Bio
                </label>
                <textarea
                  rows={4}
                  placeholder="Notes about the visit, stories, children/elderly count..."
                  value={newAlbum.description}
                  onChange={e => setNewAlbum(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm transition-all leading-relaxed"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2 bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-800 transition-colors shadow-xs disabled:opacity-60"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Creating Album...' : 'Create Album'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
