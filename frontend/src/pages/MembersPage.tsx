import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { membersApi } from '../lib/api';
import type { Member } from '../types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    membersApi.list()
      .then(res => setMembers(Array.isArray(res) ? res : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-gray-200 rounded mb-2 mx-8" />
              <div className="h-3 bg-gray-100 rounded mb-3 mx-12" />
              <div className="h-12 bg-gray-100 rounded" />
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
            <div key={member.id} className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100 card-hover text-center">
              <div className="mb-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center mx-auto text-3xl font-bold text-white">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-display text-lg font-bold text-primary-800">{member.name}</h3>
              <p className="text-amber-600 text-sm font-medium mb-3">{member.role}</p>
              {member.bio && <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
