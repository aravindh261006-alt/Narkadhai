import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, PhoneCall, MapPin, ExternalLink, Calendar } from 'lucide-react';
import { albumsApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { AlbumWithPhotos } from '../types';

const parseAlbumInfo = (desc: string | null) => {
  if (!desc) return { location: '', contact: '', cleanDescription: '' };

  let location = '';
  let contact = '';
  const lines = desc.split('\n');
  const remainingLines: string[] = [];

  for (const line of lines) {
    const locMatch = line.match(/^(?:Location|Address|Place):\s*(.+)$/i);
    const contactMatch = line.match(/^(?:Contact|Phone|Tel|Mobile|Call):\s*(.+)$/i);

    if (locMatch && !location) {
      location = locMatch[1].trim();
    } else if (contactMatch && !contact) {
      contact = contactMatch[1].trim();
    } else {
      remainingLines.push(line);
    }
  }

  const cleanDescription = remainingLines.join('\n').trim();
  return { location, contact, cleanDescription };
};

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-6 bg-gray-200 rounded w-32 mb-8 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded w-72 mb-4 animate-pulse" />
        <div className="h-6 bg-gray-100 rounded w-48 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="font-display text-2xl text-gray-700 font-bold mb-2">Album not found</h2>
        <p className="text-gray-500 mb-6">The requested album could not be found or has been removed.</p>
        <Link to="/albums" className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-medium px-5 py-2.5 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Albums
        </Link>
      </div>
    );
  }

  const { location, contact, cleanDescription } = parseAlbumInfo(album.description);
  const cleanPhone = contact ? contact.replace(/[^0-9+]/g, '') : '';
  const isLocationUrl = location ? /^https?:\/\//i.test(location.trim()) : false;
  const locationMapUrl = location
    ? (isLocationUrl
        ? location.trim()
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim()).replace(/%20/g, '+')}`)
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <Link
        to="/albums"
        className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl text-sm font-semibold mb-8 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Albums
      </Link>

      {/* Header Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold mb-2">
          <Calendar className="w-4 h-4" /> Visited {formatDate(album.visit_date)}
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-900 mb-4">{album.home_name}</h1>
      </div>

      {/* Prominent Quick-Action Cards: Phone & Location */}
      {(contact || location) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {contact && (
            <a
              href={`tel:${cleanPhone}`}
              className="group flex items-center gap-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all border border-emerald-500/30"
            >
              <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 p-3.5 group-hover:scale-110 transition-transform">
                <PhoneCall className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200 mb-0.5">Phone Number (Tap to Call)</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight truncate">{contact}</p>
              </div>
            </a>
          )}

          {location && (
            <a
              href={locationMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all border border-blue-500/30"
            >
              <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 p-3.5 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Location</p>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                </div>
                {!isLocationUrl && (
                  <p className="text-lg md:text-xl font-bold tracking-tight truncate mb-0.5">{location}</p>
                )}
                <p className={`${isLocationUrl ? 'text-lg md:text-xl font-bold tracking-tight text-white' : 'text-xs text-blue-200'} font-medium group-hover:underline flex items-center gap-1`}>
                  Open in Google Maps →
                </p>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Description if any remaining */}
      {cleanDescription && (
        <div className="bg-white rounded-2xl p-6 border border-primary-100 shadow-sm mb-10 text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
          {cleanDescription}
        </div>
      )}

      {/* Photos & Videos Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-primary-900">Photos & Videos</h2>
          <span className="text-sm text-gray-500 font-medium">
            {album.photos?.length || 0} item{album.photos?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {(!album.photos || !Array.isArray(album.photos) || album.photos.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">No photos or videos in this album yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(Array.isArray(album.photos) ? album.photos : []).map(item => {
              const isVideo = item.media_type === 'video' || /\.(mp4|mov|webm)(\?.*)?$/i.test(item.photo_url);

              if (isVideo) {
                return (
                  <div
                    key={item.id}
                    className="aspect-square rounded-2xl overflow-hidden bg-black shadow-sm hover:shadow-md transition-all relative flex flex-col justify-center border border-gray-100 group"
                  >
                    <video
                      src={item.photo_url}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs pointer-events-none">
                        {item.caption}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item.photo_url)}
                  className="group aspect-square rounded-2xl overflow-hidden bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm hover:shadow-md transition-all relative"
                >
                  <img
                    src={item.photo_url}
                    alt={item.caption || `${album.home_name} photo`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.caption}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full size view"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl animate-[fade-in_0.2s_ease-out]"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white text-3xl font-light hover:text-amber-400 transition-colors p-2 bg-black/40 rounded-full"
            aria-label="Close photo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
