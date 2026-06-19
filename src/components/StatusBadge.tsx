import type { ClaimStatus } from '../types';

const styles: Record<ClaimStatus, string> = {
  'Open':        'bg-blue-50 text-blue-700 border border-blue-200',
  'In Progress': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Pending':     'bg-purple-50 text-purple-700 border border-purple-200',
  'Closed':      'bg-slate-100 text-slate-500 border border-slate-200',
  'Completed':   'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const dots: Record<ClaimStatus, string> = {
  'Open':        'bg-blue-500',
  'In Progress': 'bg-amber-500',
  'Pending':     'bg-purple-500',
  'Closed':      'bg-slate-400',
  'Completed':   'bg-emerald-500',
};

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]} shrink-0`} />
      {status}
    </span>
  );
}
