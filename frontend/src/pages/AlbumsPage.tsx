import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ArrowRight } from 'lucide-react';
import { albumsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { Album } from '../types';

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    albumsApi.list().then(setAlbums).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="text-center mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Photo Galleries</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Albums</h1>
        <p className="text-gray-500">Photos from every home we've visited.</p>
        <div className="w-16 h-1 bg-amber-400 rounded-full mx-auto mt-4" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="h-56 bg-gray-200" />
              <div className="p-5">
                <div className="h-5 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-100 rounded mb-3 w-24" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Camera className="w-20 h-20 mx-auto mb-6 opacity-20" />
          <p className="text-xl font-display">No albums yet</p>
          <p className="text-sm mt-2">Photos from our visits will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.map(album => (
            <Link
              key={album.id}
              to={`/albums/${album.id}`}
              className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-primary-100 card-hover"
            >
              <div className="h-56 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden relative">
                {album.cover_photo_url ? (
                  <img
                    src={album.cover_photo_url}
                    alt={album.home_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-primary-300">
                    <Camera className="w-14 h-14 mb-2" />
                    <span className="text-sm">No cover photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <span className="flex items-center gap-1 bg-white/90 text-primary-700 px-3 py-1 rounded-full text-xs font-medium">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-primary-800 mb-1">{album.home_name}</h3>
                <p className="text-xs text-amber-600 font-medium mb-2">📅 {formatDate(album.visit_date)}</p>
                {album.description && (
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{album.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
