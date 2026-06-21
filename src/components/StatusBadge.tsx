import type { ClaimStatus } from '../types';

/* Centralized status → visual style map. Change labels or colors here only. */
const STATUS_STYLES: Record<ClaimStatus, { bg: string; text: string; dot: string }> = {
  'Open':              { bg: '#E6F1FB', text: '#0C447C', dot: '#1976d2' },
  'In Progress':       { bg: '#FAEEDA', text: '#633806', dot: '#d97706' },
  'Pending':           { bg: '#EEEDFE', text: '#3C3489', dot: '#7c3aed' },
  'Closed':            { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
  'Completed':         { bg: '#f0fdf4', text: '#065f46', dot: '#059669' },
  'Running':           { bg: '#E6F1FB', text: '#0C447C', dot: '#1976d2' },
  'Awaiting Approval': { bg: '#FAEEDA', text: '#633806', dot: '#d97706' },
  'Returned':          { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' },
  'Rejected':          { bg: '#fef2f2', text: '#7f1d1d', dot: '#dc2626' },
};

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: 8,
        background: s.bg,
        color: s.text,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: 6, height: 6, background: s.dot }}
      />
      {status}
    </span>
  );
}
