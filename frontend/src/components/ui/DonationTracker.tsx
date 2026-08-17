import { CheckCircle, Clock } from 'lucide-react';
import { formatINR, clamp } from '../../lib/utils';
import type { DonationTotals } from '../../types';

interface Props {
  totals: DonationTotals;
  target: number;
  compact?: boolean;
}

export default function DonationTracker({ totals, target, compact = false }: Props) {
  const safeTotals = totals || { reported_total: 0, verified_total: 0, reported_count: 0, verified_count: 0 };
  const reportedPct = target > 0 ? clamp(((safeTotals.reported_total || 0) / target) * 100, 0, 100) : 0;
  const verifiedPct = target > 0 ? clamp(((safeTotals.verified_total || 0) / target) * 100, 0, 100) : 0;

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">Donation Progress</span>
          <span className="text-xs text-primary-700 font-semibold">{Math.round(reportedPct)}% of target</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
          <div className="bg-primary-200 h-2 rounded-full transition-all" style={{ width: `${reportedPct}%` }} />
          <div className="bg-primary-600 h-2 rounded-full -mt-2 transition-all" style={{ width: `${verifiedPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatINR(safeTotals.verified_total || 0)} verified</span>
          <span>Target: {formatINR(target)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-primary-100 p-6 md:p-8">
      <h3 className="font-display text-xl font-bold text-primary-800 mb-6">Donation Progress</h3>

      {/* Target */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-gray-500">Current Goal</span>
        <span className="text-2xl font-display font-bold text-primary-700">{formatINR(target)}</span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full bg-gray-100 rounded-full h-4 mb-6 overflow-hidden">
        {/* Reported layer (lighter) */}
        <div
          className="absolute inset-y-0 left-0 bg-primary-200 rounded-full transition-all duration-700"
          style={{ width: `${reportedPct}%` }}
        />
        {/* Verified layer (darker, on top) */}
        <div
          className="absolute inset-y-0 left-0 bg-primary-600 rounded-full transition-all duration-700"
          style={{ width: `${verifiedPct}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-primary-600 font-medium uppercase tracking-wide">Reported</span>
          </div>
          <p className="text-2xl font-display font-bold text-primary-700">{formatINR(safeTotals.reported_total || 0)}</p>
          <p className="text-xs text-primary-400 mt-1">{(safeTotals.reported_count || 0)} donation{(safeTotals.reported_count || 0) !== 1 ? 's' : ''} self-reported</p>
        </div>

        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-700 font-medium uppercase tracking-wide">Verified</span>
          </div>
          <p className="text-2xl font-display font-bold text-green-700">{formatINR(safeTotals.verified_total || 0)}</p>
          <p className="text-xs text-green-400 mt-1">{(safeTotals.verified_count || 0)} donation{(safeTotals.verified_count || 0) !== 1 ? 's' : ''} confirmed</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center leading-relaxed">
        "Reported" = self-reported by donors · "Verified" = confirmed against bank/UPI statement by Narkadhai team
      </p>
    </div>
  );
}
