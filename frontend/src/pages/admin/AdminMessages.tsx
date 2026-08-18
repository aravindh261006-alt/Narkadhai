import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, CheckCircle2, Trash2, Reply, Search, Eye, X } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { contactApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { ContactMessage } from '../../types';

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const load = async () => {
    try {
      const data = await contactApi.list();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load contact messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await contactApi.markRead(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: true } : null);
      }
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to mark message as read');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await contactApi.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleOpenDetail = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      handleMarkRead(msg.id);
    }
  };

  const filtered = (Array.isArray(messages) ? messages : []).filter(m => {
    if (filter === 'unread' && m.is_read) return false;
    if (filter === 'read' && !m.is_read) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchMsg = m.message?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchMsg) return false;
    }
    return true;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Contact Messages</h1>
            <p className="text-gray-500 text-sm mt-1">Inquiries and messages sent through the public contact form.</p>
          </div>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
              <Mail className="w-3.5 h-3.5 text-primary-700" />
              {unreadCount} Unread Message{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'unread', 'read'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                }`}
              >
                {f} {f === 'all' ? `(${messages.length})` : f === 'unread' ? `(${unreadCount})` : `(${messages.length - unreadCount})`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or message..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-gray-600">No messages found</p>
            <p className="text-sm mt-1">{search ? 'Try adjusting your search query' : 'Messages from the public contact form will show up here.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(msg => (
              <div
                key={msg.id}
                onClick={() => handleOpenDetail(msg)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  !msg.is_read
                    ? 'border-primary-200 bg-primary-50/20'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${!msg.is_read ? 'bg-primary-600' : 'bg-transparent border border-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-gray-800 text-base ${!msg.is_read ? 'font-bold' : ''}`}>{msg.name}</h3>
                      <span className="text-xs text-gray-400">·</span>
                      <a
                        href={`mailto:${msg.email}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        {msg.email}
                      </a>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenDetail(msg)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <a
                    href={`mailto:${msg.email}?subject=Regarding your message to Narkadhai`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Reply via email"
                  >
                    <Reply className="w-4 h-4" />
                  </a>

                  {!msg.is_read && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
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

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-[slide-up_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-display text-xl font-bold text-gray-800">{selectedMessage.name}</h3>
                  <a href={`mailto:${selectedMessage.email}`} className="text-primary-600 text-sm hover:underline">
                    {selectedMessage.email}
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">Received {formatDate(selectedMessage.created_at)}</p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Message Content</p>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border border-gray-100 max-h-80 overflow-y-auto">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Regarding your message to Narkadhai`}
                  className="flex-1 bg-primary-700 hover:bg-primary-800 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Reply className="w-4 h-4" /> Reply via Email
                </a>
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
