import { useEffect, useState } from 'react';
import { Users, ArrowLeft, X, Sparkles } from 'lucide-react';
import { membersApi, getCachedMembers } from '../lib/api';
import type { Member } from '../types';

export default function MembersPage() {
  const cached = getCachedMembers();
  const [members, setMembers] = useState<Member[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    membersApi.list()
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setMembers(list);
      })
      .catch(() => {
        if (!cached) setMembers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedMember(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="text-center mb-12">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">The People</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Our Members</h1>
        <p className="text-gray-500 max-w-xl mx-auto">The team behind every visit, every delivery, every smile.</p>
        <div className="w-16 h-1 bg-amber-400 rounded-full mx-auto mt-4" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-gray-100 shadow-xs">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-5 bg-gray-200 rounded-md mb-2 mx-6" />
              <div className="h-4 bg-gray-100 rounded-md mb-3 mx-10" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 bg-gray-100 rounded mx-2" />
                <div className="h-3 bg-gray-100 rounded mx-4" />
              </div>
              <div className="h-4 w-20 bg-gray-100 rounded mx-auto mt-4" />
            </div>
          ))}
        </div>
      ) : safeMembers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No members added yet.</p>
          <p className="text-sm">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {safeMembers.map(member => (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMember(member); }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100 card-hover text-center cursor-pointer group hover:scale-[1.02] hover:shadow-md hover:border-primary-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="mb-4 relative">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    loading="lazy"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary-100 group-hover:border-primary-400 group-hover:scale-105 transition-all"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center mx-auto text-3xl font-bold text-white group-hover:scale-105 transition-all">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-display text-lg font-bold text-primary-800 group-hover:text-primary-600 transition-colors">{member.name}</h3>
              <p className="text-amber-600 text-sm font-medium mb-3">{member.role}</p>
              {member.bio && (
                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                  {member.bio}
                </p>
              )}
              <span className="inline-block mt-3 text-xs text-primary-600 font-semibold group-hover:underline">
                View details →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-[slide-up_0.3s_ease-out] border border-primary-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Close / Back Buttons */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => setSelectedMember(null)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 px-3.5 py-1.5 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Members
              </button>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="text-center">
              <div className="mb-6">
                {selectedMember.photo_url ? (
                  <img
                    src={selectedMember.photo_url}
                    alt={selectedMember.name}
                    loading="lazy"
                    width={176}
                    height={176}
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover mx-auto border-4 border-amber-400/40 shadow-lg"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center mx-auto text-5xl font-bold text-white shadow-lg">
                    {selectedMember.name.charAt(0)}
                  </div>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-900 mb-1.5">
                {selectedMember.name}
              </h2>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {selectedMember.role}
              </div>

              <div className="bg-primary-50/50 rounded-2xl p-5 sm:p-6 text-left border border-primary-100/60 max-h-60 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">About</h4>
                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                  {selectedMember.bio || `${selectedMember.name} is a dedicated member supporting Narkadhai's community visits and initiatives.`}
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary-700/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
