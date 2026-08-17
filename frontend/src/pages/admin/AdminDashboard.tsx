import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Mail, Clock, CheckCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/utils';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totals = data?.totals || {};
  const target = totals.target || 0;
  const verifiedPct = target > 0 ? Math.min((totals.verified_total / target) * 100, 100) : 0;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">Dashboard</h1>
          {data?.admin && (
            <p className="text-gray-500 text-sm mt-1">
              Welcome, {data.admin.name} · <span className="capitalize bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">{data.admin.role}</span>
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Reported Total', value: formatINR(totals.reported_total || 0), sub: `${totals.reported_count || 0} donations`, icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
                { label: 'Verified Total', value: formatINR(totals.verified_total || 0), sub: `${totals.verified_count || 0} confirmed`, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
                { label: 'Donation Target', value: formatINR(totals.target || 0), sub: `${Math.round(verifiedPct)}% reached`, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
                { label: 'Unread Messages', value: data?.unread_messages || 0, sub: 'contact messages', icon: Mail, color: 'bg-purple-50 text-purple-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-display font-bold text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress toward target</span>
                <span className="text-sm text-primary-700 font-semibold">{Math.round(verifiedPct)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="bg-primary-600 h-3 rounded-full transition-all" style={{ width: `${verifiedPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent donations */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-gray-800">Recent Donations</h2>
                  <Link to="/admin/donations" className="text-xs text-primary-600 hover:underline">View all →</Link>
                </div>
                <div className="space-y-3">
                  {(!data?.recent_donations || !Array.isArray(data.recent_donations) || data.recent_donations.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-4">No donations yet</p>
                  ) : (Array.isArray(data.recent_donations) ? data.recent_donations : []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{d.donor_name}</p>
                        <p className="text-xs text-gray-400">{formatDate(d.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800">{formatINR(d.amount)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          d.status === 'verified' ? 'bg-green-100 text-green-700' :
                          d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent messages */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-gray-800">Recent Messages</h2>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-3">
                  {(!data?.recent_messages || !Array.isArray(data.recent_messages) || data.recent_messages.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
                  ) : (Array.isArray(data.recent_messages) ? data.recent_messages : []).map((m: any) => (
                    <div key={m.id} className={`flex items-start gap-2 ${!m.is_read ? 'opacity-100' : 'opacity-60'}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!m.is_read ? 'bg-primary-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.email} · {formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
