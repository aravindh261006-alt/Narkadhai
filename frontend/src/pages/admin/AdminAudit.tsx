import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, FileText, Loader2, Download } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { auditApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import type { AuditDoc } from '../../types';

export default function AdminAudit() {
  const [docs, setDocs] = useState<AuditDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', file_url: '' });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => auditApi.list()
    .then(res => setDocs(Array.isArray(res) ? res : []))
    .catch(() => setDocs([]))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleUploadAndSave = async () => {
    if (!form.title) return toast.error('Title is required');
    if (!fileToUpload && !form.file_url) return toast.error('Please select a file or paste a URL');

    setSaving(true);
    let fileUrl = form.file_url;

    if (fileToUpload) {
      setUploading(true);
      try {
        const ext = fileToUpload.name.split('.').pop() || 'pdf';
        const path = `${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from('audit-docs').upload(path, fileToUpload);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('audit-docs').getPublicUrl(data.path);
        fileUrl = publicUrl;
      } catch (uploadErr: any) {
        console.error('Audit doc file upload failed:', uploadErr);
        toast.error(uploadErr?.message || uploadErr?.response?.data?.detail || 'File upload failed. Check Supabase storage bucket & RLS policies.');
        setSaving(false);
        setUploading(false);
        return;
      } finally { setUploading(false); }
    }

    try {
      await auditApi.create({ title: form.title, description: form.description, file_url: fileUrl });
      toast.success('Document added');
      setShowForm(false);
      setForm({ title: '', description: '', file_url: '' });
      setFileToUpload(null);
      load();
    } catch (err: any) {
      console.error('Failed to save audit document:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to save document');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this audit document?')) return;
    try {
      await auditApi.delete(id);
      toast.success('Document deleted');
      setDocs(prev => (Array.isArray(prev) ? prev : []).filter(d => d.id !== id));
    } catch (err: any) {
      console.error('Failed to delete audit document:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete');
    }
  };

  const safeDocs = Array.isArray(docs) ? docs : [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-800">Audit Documents</h1>
            <p className="text-gray-500 text-sm mt-1">Upload and manage transparency/financial records.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
        ) : safeDocs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No audit documents yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeDocs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{doc.title}</p>
                  {doc.description && <p className="text-sm text-gray-500 truncate">{doc.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Uploaded by {doc.uploaded_by} · {formatDate(doc.uploaded_at)}</p>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-all">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add document modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold mb-4">Add Audit Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm" placeholder="e.g. Financial Statement Q1 2024" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none" placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary-300 transition-colors">
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
                  {fileToUpload ? (
                    <p className="text-sm text-primary-600">📎 {fileToUpload.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Click to select PDF or image</p>
                  )}
                </label>
                <p className="text-xs text-gray-400 mt-1 text-center">— or paste a URL —</p>
                <input value={form.file_url} onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm mt-1" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUploadAndSave} disabled={saving || uploading}
                className="flex-1 bg-primary-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {(saving || uploading) ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Document'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
