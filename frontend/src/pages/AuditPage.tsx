import { useEffect, useState } from 'react';
import { FileText, Download, Shield } from 'lucide-react';
import DisclaimerBanner from '../components/ui/DisclaimerBanner';
import { auditApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { AuditDoc } from '../types';

export default function AuditPage() {
  const [docs, setDocs] = useState<AuditDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.list().then(setDocs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-[slide-up_0.6s_ease-out]">
      <div className="mb-10">
        <span className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Transparency</span>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-800 mt-2 mb-4">Audit & Financial Records</h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full" />
      </div>

      <DisclaimerBanner variant="audit" className="mb-8" />

      <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 mb-10 flex items-start gap-4">
        <Shield className="w-8 h-8 text-primary-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-primary-800 mb-1">Our commitment to transparency</h3>
          <p className="text-primary-600 text-sm leading-relaxed">
            We publish every financial record voluntarily. These are self-prepared documents shared so that anyone who donates can see exactly where their money went. We invite scrutiny — if you spot a discrepancy, please contact us.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse border border-gray-100">
              <div className="h-5 bg-gray-200 rounded mb-2 w-48" />
              <div className="h-4 bg-gray-100 rounded w-72" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-display">No audit documents yet</p>
          <p className="text-sm mt-1">Financial records will be published here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl p-5 border border-primary-100 shadow-sm flex items-center justify-between gap-4 card-hover">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-primary-800 truncate">{doc.title}</h3>
                  {doc.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded by {doc.uploaded_by} · {formatDate(doc.uploaded_at)}
                  </p>
                </div>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-shrink-0 inline-flex items-center gap-2 bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
