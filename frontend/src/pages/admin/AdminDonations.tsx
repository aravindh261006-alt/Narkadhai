import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Eye, ExternalLink } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { donationsApi } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/utils';
import type { Donation } from '../../types';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700',  Icon: Clock },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-700',  Icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700',      Icon: XCircle },
};

export default function AdminDonations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [selected, setSelected] = useState<Donation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = () => donationsApi.list().then(setDonations).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await donationsApi.updateStatus(id, status);
      toast.success(`Donation marked as ${status}`);
      setDonations(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = donations
    .filter(d => {
      // 1. Status Filter
      if (filter !== 'all' && d.status !== filter) return false;

      // 2. Name Search
      if (searchTerm && !d.donor_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      // 3. Date Range Filter
      if (startDate) {
        const dDate = new Date(d.created_at).setHours(0, 0, 0, 0);
        const sDate = new Date(startDate).setHours(0, 0, 0, 0);
        if (dDate < sDate) return false;
      }
      if (endDate) {
        const dDate = new Date(d.created_at).setHours(23, 59, 59, 999);
        const eDate = new Date(endDate).setHours(23, 59, 59, 999);
        if (dDate > eDate) return false;
      }

      return true;
    });

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800">Donations</h1>
          <p className="text-gray-500 text-sm mt-1">Review and verify donor-reported donations.</p>
        </div>

        {/* Search and Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search Donor</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by donor name..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {f} {f === 'all' ? `(${donations.length})` : `(${donations.filter(d => d.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Donor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">UTR / Txn ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Screenshot</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No donations found</td></tr>
                ) : filtered.map(d => {
                  const cfg = STATUS_CONFIG[d.status];
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{d.donor_name}</p>
                        <p className="text-xs text-gray-400">{d.donor_email}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{formatINR(d.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">{d.utr_or_txn_id || '—'}</td>
                      <td className="px-4 py-3">
                        {d.screenshot_url ? (
                          <button
                            onClick={() => setSelected(d)}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                          >
                            🖼️ View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(d.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(d)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {d.status !== 'verified' && (
                            <button
                              onClick={() => updateStatus(d.id, 'verified')}
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-all"
                              title="Mark verified"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {d.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(d.id, 'rejected')}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                              title="Mark rejected"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-gray-800 mb-4">Donation Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Donor Name', selected.donor_name],
                ['Email', selected.donor_email],
                ['Amount', formatINR(selected.amount)],
                ['UTR / Txn ID', selected.utr_or_txn_id || '—'],
                ['Status', selected.status],
                ['Submitted', formatDate(selected.created_at)],
                ['Verified By', selected.verified_by || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500 flex-shrink-0">{k}</dt>
                  <dd className="font-medium text-gray-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {selected.screenshot_url && (
              <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline">
                <ExternalLink className="w-4 h-4" /> View screenshot
              </a>
            )}
            <div className="flex gap-3 mt-6">
              {selected.status !== 'verified' && (
                <button onClick={() => { updateStatus(selected.id, 'verified'); setSelected(null); }}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                  Mark Verified
                </button>
              )}
              {selected.status !== 'rejected' && (
                <button onClick={() => { updateStatus(selected.id, 'rejected'); setSelected(null); }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                  Mark Rejected
                </button>
              )}
              <button onClick={() => setSelected(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
