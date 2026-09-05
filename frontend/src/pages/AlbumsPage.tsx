import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { albumsApi, getCachedAlbums } from '../lib/api';
import { formatDate, parseAlbumDescription } from '../lib/utils';
import type { Album } from '../types';

const ITEMS_PER_PAGE = 12;

export default function AlbumsPage() {
  const cached = getCachedAlbums();
  const [albums, setAlbums] = useState<Album[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    albumsApi.list()
      .then(res => setAlbums(Array.isArray(res) ? res : []))
      .catch(() => {
        if (!cached) setAlbums([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const safeAlbums = Array.isArray(albums) ? albums : [];
  const totalPages = Math.ceil(safeAlbums.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAlbums = safeAlbums.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100 shadow-xs">
              <div className="h-56 bg-gray-200" />
              <div className="p-5">
                <div className="h-5 bg-gray-200 rounded-md mb-2 w-3/4" />
                <div className="h-3.5 bg-gray-100 rounded mb-3 w-28" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : safeAlbums.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Camera className="w-20 h-20 mx-auto mb-6 opacity-20" />
          <p className="text-xl font-display">No albums yet</p>
          <p className="text-sm mt-2">Photos from our visits will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentAlbums.map(album => {
              const cleanDesc = parseAlbumDescription(album.description).description;
              return (
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
                        loading="lazy"
                        width={400}
                        height={224}
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
                    <p className="text-xs text-amber-600 font-medium mb-2">{formatDate(album.visit_date)}</p>
                    {cleanDesc && (
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{cleanDesc}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-gray-700">
                  {Math.min(startIndex + ITEMS_PER_PAGE, safeAlbums.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-700">{safeAlbums.length}</span> albums
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary-700 text-white shadow-sm'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Next page"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
