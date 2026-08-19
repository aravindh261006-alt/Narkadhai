import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquareQuote, CheckCircle2, XCircle, Trash2, Search, Eye, X, Sparkles } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { communityMessagesApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { CommunityMessage } from '../../types';

export default function AdminCommunityMessages() {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<CommunityMessage | null>(null);

  const load = async () => {
    try {
      const data = await communityMessagesApi.listAll();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load community messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdateStatus = async (id: string, is_approved: boolean) => {
    // Optimistic UI update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_approved } : m));
    if (selectedMessage?.id === id) {
      setSelectedMessage(prev => prev ? { ...prev, is_approved } : null);
    }

    try {
      await communityMessagesApi.updateStatus(id, is_approved);
      toast.success(is_approved ? 'Message approved for public display' : 'Message unapproved / rejected');
      await load();
    } catch (err: any) {
      console.error('Failed to update message status:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to update status');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this community message? This cannot be undone.')) {
      return;
    }

    try {
      await communityMessagesApi.delete(id);
      toast.success('Community message deleted');
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (err: any) {
      console.error('Failed to delete community message:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete message');
    }
  };

  const filtered = (Array.isArray(messages) ? messages : []).filter(m => {
    if (filter === 'pending' && m.is_approved) return false;
    if (filter === 'approved' && !m.is_approved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchMsg = m.message?.toLowerCase().includes(q);
      if (!matchName && !matchMsg) return false;
    }
    return true;
  });

  const pendingCount = messages.filter(m => !m.is_approved).length;
  const approvedCount = messages.filter(m => m.is_approved).length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Community Messages</h1>
            <p className="text-gray-500 text-sm mt-1">Review, approve, or reject public messages and testimonials.</p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {pendingCount} Pending Review
            </span>
          )}
        </div>

        {/* Filter tabs and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                }`}
              >
                {f} {f === 'all' ? `(${messages.length})` : f === 'pending' ? `(${pendingCount})` : `(${approvedCount})`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by author name or message..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm text-gray-400">
            <MessageSquareQuote className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-gray-600">No community messages found</p>
            <p className="text-sm mt-1">{search ? 'Try adjusting your search query' : 'Messages submitted on the home page will appear here.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(msg => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  !msg.is_approved
                    ? 'border-amber-200 bg-amber-50/15'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                    {msg.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-base">{msg.name}</h3>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        msg.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {msg.is_approved ? 'Approved' : 'Pending Review'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      "{msg.message}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedMessage(msg)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {!msg.is_approved ? (
                    <button
                      onClick={() => handleUpdateStatus(msg.id, true)}
                      className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-green-200"
                      title="Approve message"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(msg.id, false)}
                      className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-gray-200"
                      title="Unapprove / Reject"
                    >
                      <XCircle className="w-3.5 h-3.5 text-gray-500" />
                      Reject
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-[slide-up_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-lg">
                    {selectedMessage.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-gray-900">{selectedMessage.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(selectedMessage.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Message Content</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedMessage.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedMessage.is_approved ? 'Approved' : 'Pending Review'}
                  </span>
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl text-gray-800 text-base leading-relaxed whitespace-pre-wrap border border-gray-100 max-h-80 overflow-y-auto font-sans">
                  "{selectedMessage.message}"
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {!selectedMessage.is_approved ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedMessage.id, true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve for Public Wall
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(selectedMessage.id, false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Reject / Hide from Wall
                  </button>
                )}

                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 text-sm transition-all"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
