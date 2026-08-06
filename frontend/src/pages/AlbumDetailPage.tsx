import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { albumsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { AlbumWithPhotos } from '../types';

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (id) albumsApi.get(id).then(setAlbum).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="font-display text-2xl text-gray-500">Album not found</h2>
        <Link to="/albums" className="text-primary-600 mt-4 inline-block">← Back to Albums</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <Link to="/albums" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-medium mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Albums
      </Link>

      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-primary-800 mb-2">{album.home_name}</h1>
        <p className="text-amber-600 font-medium">📅 Visited {formatDate(album.visit_date)}</p>
        {album.description && <p className="text-gray-600 mt-3 max-w-2xl leading-relaxed">{album.description}</p>}
      </div>

      {album.photos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No photos in this album yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo.photo_url)}
              className="group aspect-square rounded-xl overflow-hidden bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || 'Album photo'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl font-light hover:text-amber-400 transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
