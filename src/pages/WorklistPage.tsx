import type { Claim, ClaimStatus } from '../types';
import { claims } from '../data/claims';
import StatusBadge from '../components/StatusBadge';

interface Props {
  onSelectClaim: (claim: Claim) => void;
  claimStatusOverrides?: Record<string, ClaimStatus>;
}

const slaAtRiskCount = claims.filter(c => c.slaDaysRemaining <= 5).length;

/* Status → next-action config. passive = no button, show muted text + icon instead. */
const NEXT_ACTION: Record<ClaimStatus, { label: string; passive?: true }> = {
  'In Progress':       { label: 'Review coverage package' },
  'Open':              { label: 'Start AI review' },
  'Pending':           { label: 'Awaiting additional information', passive: true },
  'Running':           { label: 'View execution' },
  'Awaiting Approval': { label: 'Review package' },
  'Returned':          { label: 'Review changes' },
  'Completed':         { label: 'Workflow complete', passive: true },
  'Rejected':          { label: 'Execution closed', passive: true },
  'Closed':            { label: 'Claim closed', passive: true },
};

function ClockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 3.5v2.7L7.8 7.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ClaimCardProps {
  claim: Claim;
  status: ClaimStatus;
  onSelect: () => void;
}

function ClaimCard({ claim, status, onSelect }: ClaimCardProps) {
  const slaUrgent = claim.slaDaysRemaining <= 5;
  const action = NEXT_ACTION[status];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className="bg-white select-none transition-colors duration-100 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1976d2]/40"
      style={{
        border: '0.5px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
    >
      {/* ── Top row: identity + badge ── */}
      <div className="flex items-start justify-between gap-4">

        {/* Left: name + meta line */}
        <div className="min-w-0">
          <p
            className="font-medium text-[#0f3460] leading-snug truncate"
            style={{ fontSize: 16 }}
          >
            {claim.claimantName}
          </p>

          {/* Meta line */}
          <div
            className="flex items-center flex-wrap"
            style={{ gap: 10, marginTop: 6 }}
          >
            {/* Claim ID */}
            <span
              className="font-mono text-slate-400 shrink-0"
              style={{ fontSize: 12 }}
            >
              {claim.id}
            </span>

            {/* Loss-type tag */}
            <span
              className="shrink-0"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 8,
                border: '0.5px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
              }}
            >
              {claim.lossType}
            </span>

            {/* Reserve */}
            <span
              className="text-slate-500 tabular-nums shrink-0"
              style={{ fontSize: 12 }}
            >
              ${claim.reserve.toLocaleString()}
            </span>

            {/* SLA */}
            <span
              className="inline-flex items-center gap-1 tabular-nums shrink-0"
              style={{ fontSize: 12, color: slaUrgent ? '#791F1F' : '#94a3b8' }}
            >
              <ClockIcon />
              {claim.slaDaysRemaining}d to SLA
            </span>
          </div>
        </div>

        {/* Right: status badge */}
        <div className="shrink-0 pt-0.5">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* ── Bottom row: divider + next action ── */}
      <div style={{ marginTop: 13, paddingTop: 13, borderTop: '0.5px solid #e2e8f0' }}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 shrink-0" style={{ fontSize: 13 }}>
            Next action
          </span>

          {action.passive ? (
            <span
              className="inline-flex items-center gap-1.5 text-slate-400"
              style={{ fontSize: 13 }}
            >
              <ClockIcon size={13} />
              {action.label}
            </span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onSelect(); }}
              className="inline-flex items-center gap-1.5 font-medium transition-colors duration-100 hover:text-[#0f3460] focus-visible:outline-none"
              style={{
                fontSize: 13,
                color: '#1976d2',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {action.label}
              <ArrowIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorklistPage({ onSelectClaim, claimStatusOverrides }: Props) {
  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-8 pt-10 pb-12">

        {/* ── Page header ── */}
        <div className="mb-7">
          <h1 className="text-[1.75rem] font-bold text-[#0f3460] tracking-tight leading-tight">
            Claims Worklist
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-normal leading-relaxed">
            Select a claim below to open the Adjuster Workspace with QARL.
          </p>
          {slaAtRiskCount > 0 && (
            <p className="text-[13px] font-medium mt-1.5" style={{ color: '#854F0B' }}>
              {slaAtRiskCount} approaching SLA
            </p>
          )}
        </div>

        {/* ── Card list — max 880px, centered ── */}
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div className="flex flex-col" style={{ gap: 12 }}>
            {claims.map(claim => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                status={claimStatusOverrides?.[claim.id] ?? claim.status}
                onSelect={() => onSelectClaim(claim)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
