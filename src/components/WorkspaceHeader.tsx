import type { Claim } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  claim: Claim;
  onBack: () => void;
}

export default function WorkspaceHeader({ claim, onBack }: Props) {
  return (
    <div
      className="bg-white border-b border-slate-200 shrink-0"
      style={{ boxShadow: '0 1px 3px 0 rgba(15,52,96,0.06)' }}
    >
      <div className="flex items-center px-6 h-14 gap-5">

        {/* Back + breadcrumb */}
        <div className="flex items-center gap-2 pr-5 border-r border-slate-200 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#1976d2] hover:text-[#1256a0] transition-colors font-bold uppercase tracking-wider"
            style={{ fontSize: 11 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Worklist
          </button>
          <span className="text-slate-300 text-xs font-light select-none">/</span>
          <span className="font-bold text-[#0f3460] tracking-wide" style={{ fontSize: 11 }}>
            Adjuster Workspace
          </span>
        </div>

        {/* Claimant name + loss type */}
        <div className="flex flex-col justify-center gap-0.5 shrink-0">
          <span className="font-bold text-[#0f3460] leading-none" style={{ fontSize: 15 }}>
            {claim.claimantName}
          </span>
          <span className="font-medium text-slate-400 leading-none" style={{ fontSize: 11 }}>
            {claim.lossType} Claim
          </span>
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-200 shrink-0" style={{ height: 28 }} />

        {/* Status badge */}
        <div className="shrink-0">
          <StatusBadge status={claim.status} />
        </div>

        {/* SLA — right-aligned */}
        <div
          className="ml-auto flex items-center gap-2 rounded-lg px-3 shrink-0"
          style={{
            height: 32,
            background: claim.slaDaysRemaining <= 5 ? '#fffbeb' : '#f8fafc',
            border: `1px solid ${claim.slaDaysRemaining <= 5 ? '#fde68a' : '#e2e8f0'}`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle
              cx="6" cy="6" r="5"
              stroke={claim.slaDaysRemaining <= 5 ? '#d97706' : '#94a3b8'}
              strokeWidth="1.3"
            />
            <path
              d="M6 3.5v2.8l1.8 1.8"
              stroke={claim.slaDaysRemaining <= 5 ? '#d97706' : '#94a3b8'}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="font-bold whitespace-nowrap"
            style={{
              fontSize: 11,
              color: claim.slaDaysRemaining <= 5 ? '#92400e' : '#64748b',
            }}
          >
            SLA: {claim.slaDaysRemaining} days remaining
          </span>
        </div>

      </div>
    </div>
  );
}
