import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Shield, Loader2, ShieldCheck, Clock } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface AdminRecord {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'audit';
  created_at: string;
  last_login?: string;
}

export default function AdminAccess() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'audit' });
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchInitialData = async () => {
    try {
      const [me, data] = await Promise.all([
        adminApi.me().catch((err) => {
          console.warn('Failed to load current admin profile:', err);
          return null;
        }),
        adminApi.listAdmins().catch((err) => {
          console.warn('Failed to load admin list:', err);
          return [];
        }),
      ]);

      if (!isMounted.current) return;

      if (me) {
        setCurrentUser(me);
        try {
          localStorage.setItem('narkadhai_admin_role', me.role);
        } catch {}
      }

      setAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error initializing AdminAccess:', e);
      if (isMounted.current) {
        toast.error('Failed to load admin lists');
        setAdmins([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const refreshAdmins = async () => {
    try {
      const data = await adminApi.listAdmins();
      if (isMounted.current) {
        setAdmins(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to refresh admin list:', e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchInitialData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return toast.error('Email is required');
    setInviting(true);
    setWarningMessage(null);
    try {
      const resp = await adminApi.addAdmin(form);
      if (resp.warning) {
        setWarningMessage(resp.warning);
        toast.success('Admin added with default password: Narkadhai@2024');
      } else {
        toast.success('Admin added! Welcome email sent with login credentials.');
        setForm({ email: '', role: 'audit' });
      }
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add admin');
    } finally {
      if (isMounted.current) setInviting(false);
    }
  };

  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${email}? This will instantly log them out and delete their access.`)) {
      return;
    }
    try {
      await adminApi.removeAdmin(id);
      toast.success('Access revoked');
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to revoke access');
    }
  };

  const isOwner = currentUser?.role === 'owner';

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team roles and add new admins.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !isOwner ? (
          <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
            <h2 className="font-display text-2xl font-bold text-gray-800">Access Denied</h2>
            <p className="text-gray-500 mt-2">Only owners can manage admin accounts and permissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add admin form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-800">Add New Admin</h3>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="admin@example.com"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
                    >
                      <option value="audit">Reviewer (Review & verify donations)</option>
                      <option value="owner">Owner (Full access to all settings, members, albums, admins)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-primary-50/60 rounded-xl border border-primary-100 text-xs text-primary-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-primary-800">
                      <span>🔑</span> Default Credentials:
                    </p>
                    <p className="text-primary-700">
                      Account will be provisioned automatically with default password: <strong>Narkadhai@2024</strong>. A welcome email with login instructions will be sent.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full bg-primary-700 hover:bg-primary-800 text-white py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding Admin...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Add Admin</>
                    )}
                  </button>
                </form>

                {warningMessage && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <p className="font-semibold text-amber-900 mb-1">⚠️ Status Note:</p>
                    <p className="break-all">{warningMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(!Array.isArray(admins) || admins.length === 0) ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No admins found</td></tr>
                    ) : (Array.isArray(admins) ? admins : []).map(a => {
                      const isSelf = currentUser?.email?.toLowerCase() === a.email?.toLowerCase();
                      const isOwnerEmail = a.email?.toLowerCase() === 'narkadhai.official@gmail.com';
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-800">{a.name || a.email.split('@')[0]}</p>
                            <p className="text-xs text-gray-400">{a.email}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              a.role === 'owner' ? 'bg-primary-100 text-primary-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {a.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-500 text-xs">
                            {a.last_login ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {formatDate(a.last_login)}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Never</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isSelf ? (
                              <span className="text-xs text-primary-600 font-medium">You</span>
                            ) : isOwnerEmail ? (
                              <span className="text-xs text-gray-400 italic">Protected</span>
                            ) : (
                              <button
                                onClick={() => handleRevoke(a.id, a.email)}
                                className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
