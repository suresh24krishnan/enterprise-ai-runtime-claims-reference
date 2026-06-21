import type { Claim, ClaimStatus } from '../types';
import { claims } from '../data/claims';
import StatusBadge from '../components/StatusBadge';

interface Props {
  onSelectClaim: (claim: Claim) => void;
  claimStatusOverrides?: Record<string, ClaimStatus>;
}

/* ── Constants ── */
const slaAtRiskCount = claims.filter(c => c.slaDaysRemaining <= 5).length;
const DEMO_CLAIM_ID  = 'CLM-2024-0892';

/* ── SVG icons ── */
function IconClaims() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="1.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 5.5h6M5 8h6M5 10.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v3.5L10.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconReserve() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12.5l3.5-4L8 10.5l2.5-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function ClockSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.15"/>
      <path d="M5.5 3v3l1.8 1.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Metric card ── */
interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  subBg: string;
  subText: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, sub, accent, subBg, subText, icon }: MetricCardProps) {
  return (
    <div
      className="bg-white flex overflow-hidden"
      style={{
        borderRadius: 14,
        border: '1px solid #e8edf5',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(15,52,96,0.06)',
      }}
    >
      {/* Left accent stripe */}
      <div style={{ width: 4, background: accent, flexShrink: 0 }} />

      <div className="flex items-center justify-between flex-1" style={{ padding: '14px 20px' }}>
        <div>
          {/* Label — uppercase, tracking, very muted */}
          <p
            className="font-bold uppercase tracking-widest leading-none mb-2.5"
            style={{ fontSize: 9.5, color: '#94a3b8' }}
          >
            {label}
          </p>
          {/* Primary value — strong, large */}
          <p
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: 32, color: accent, letterSpacing: '-0.025em' }}
          >
            {value}
          </p>
          {/* Sub-chip — tight, small */}
          <span
            className="inline-block font-semibold mt-2 rounded-md leading-none"
            style={{ fontSize: 10.5, padding: '2px 7px', background: subBg, color: subText }}
          >
            {sub}
          </span>
        </div>

        {/* Icon bubble */}
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: 38, height: 38, background: subBg, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const METRIC_CARDS: MetricCardProps[] = [
  {
    label: 'Open Claims',
    value: '3',
    sub: 'Assigned to you',
    accent: '#1976d2',
    subBg: '#E6F1FB',
    subText: '#0C447C',
    icon: <IconClaims />,
  },
  {
    label: 'SLA at Risk',
    value: String(slaAtRiskCount),
    sub: 'Due within 5 days',
    accent: '#d97706',
    subBg: '#FAEEDA',
    subText: '#633806',
    icon: <IconClock />,
  },
  {
    label: 'Avg. Reserve',
    value: '$187K',
    sub: 'Across active claims',
    accent: '#0f3460',
    subBg: '#edf1f7',
    subText: '#1e3a5f',
    icon: <IconReserve />,
  },
];

/* ── Column definitions (7 columns, adjuster removed) ── */
const COLUMNS = [
  { label: 'Claim ID',     align: 'left'  as const, width: 148, pl: 24 },
  { label: 'Claimant',     align: 'left'  as const },
  { label: 'Loss Type',    align: 'left'  as const, width: 130 },
  { label: 'Date of Loss', align: 'left'  as const, width: 114 },
  { label: 'Status',       align: 'left'  as const, width: 148 },
  { label: 'Reserve',      align: 'right' as const, width: 122 },
  { label: 'SLA',          align: 'right' as const, width: 88, pr: 24 },
];

/* ── Main page ── */
export default function WorklistPage({ onSelectClaim, claimStatusOverrides }: Props) {
  return (
    <div className="flex-1 overflow-auto" style={{ background: '#f1f5f9' }}>
      <div className="max-w-[1600px] mx-auto px-8 pt-10 pb-12">

        {/* ── Page header ── */}
        <div className="mb-7">
          <h1
            className="font-bold text-[#0f3460] tracking-tight leading-tight"
            style={{ fontSize: 26 }}
          >
            Claims Worklist
          </h1>
          <p className="mt-1.5 font-normal leading-snug text-slate-500" style={{ fontSize: 13.5 }}>
            Select a claim to begin AI-assisted claim review.
          </p>
          <p className="mt-1 font-medium text-slate-400" style={{ fontSize: 12 }}>
            {claims.length} Active Claims &bull; {slaAtRiskCount} Approaching SLA
          </p>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-3 gap-5 mb-7">
          {METRIC_CARDS.map(card => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>

        {/* ── Table card ── */}
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: 14,
            border: '1px solid #e8edf5',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(15,52,96,0.06)',
          }}
        >
          {/* Table toolbar */}
          <div
            className="flex items-center justify-between border-b"
            style={{ padding: '13px 24px', borderColor: '#f0f4f9' }}
          >
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-[#0f3460]" style={{ fontSize: 13.5 }}>
                Active Claims
              </h2>
              <span className="font-medium text-slate-400" style={{ fontSize: 12 }}>
                {claims.length} claims
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg"
              style={{ padding: '4px 11px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <span
                className="rounded-full bg-emerald-500 shrink-0"
                style={{ width: 6, height: 6, boxShadow: '0 0 5px rgba(16,185,129,0.6)' }}
              />
              <span className="font-semibold text-emerald-700" style={{ fontSize: 11 }}>
                QARL Ready
              </span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {COLUMNS.map(col => (
                <col key={col.label} style={col.width ? { width: col.width } : undefined} />
              ))}
            </colgroup>

            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f4f9' }}>
                {COLUMNS.map(col => (
                  <th
                    key={col.label}
                    className="font-semibold uppercase tracking-widest whitespace-nowrap"
                    style={{
                      fontSize: 9.5,
                      color: '#94a3b8',
                      padding: `10px ${col.pr ?? 12}px 10px ${col.pl ?? 12}px`,
                      textAlign: col.align,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {claims.map((claim) => {
                const status     = claimStatusOverrides?.[claim.id] ?? claim.status;
                const slaUrgent  = claim.slaDaysRemaining <= 5;
                const isPrimary  = claim.id === DEMO_CLAIM_ID;

                return (
                  <tr
                    key={claim.id}
                    onClick={() => onSelectClaim(claim)}
                    className="group relative cursor-pointer"
                    style={{
                      borderBottom: '1px solid #f0f4f9',
                      transition: 'background 80ms ease',
                      background: isPrimary ? '#fffcf8' : undefined,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = isPrimary ? '#fff8ed' : '#f8fbff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = isPrimary ? '#fffcf8' : '';
                    }}
                  >
                    {/* Claim ID — muted, smaller, secondary */}
                    <td className="relative" style={{ padding: '13px 12px 13px 24px' }}>
                      {/* Left accent: amber always for primary, blue on hover for others */}
                      <span
                        className={`absolute left-0 top-0 h-full rounded-r ${
                          isPrimary
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        style={{
                          width: 3,
                          background: isPrimary ? '#d97706' : '#1976d2',
                          transition: 'opacity 80ms ease',
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="font-mono font-medium rounded-md inline-block"
                        style={{
                          fontSize: 10.5,
                          padding: '2px 8px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {claim.id}
                      </span>
                    </td>

                    {/* Claimant — primary identity, more prominent */}
                    <td style={{ padding: '13px 12px' }}>
                      <span
                        className="font-semibold text-[#0f3460] block truncate"
                        style={{ fontSize: 14 }}
                      >
                        {claim.claimantName}
                      </span>
                    </td>

                    {/* Loss Type — metadata pill, compact */}
                    <td style={{ padding: '13px 12px' }}>
                      <span
                        className="font-medium rounded-md inline-block"
                        style={{
                          fontSize: 10.5,
                          padding: '2px 8px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {claim.lossType}
                      </span>
                    </td>

                    {/* Date of Loss */}
                    <td style={{ padding: '13px 12px' }}>
                      <span className="tabular-nums text-slate-400" style={{ fontSize: 12 }}>
                        {claim.dateOfLoss}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 12px' }}>
                      <StatusBadge status={status} />
                    </td>

                    {/* Reserve */}
                    <td style={{ padding: '13px 12px', textAlign: 'right' }}>
                      <span
                        className="font-semibold tabular-nums text-[#0f3460]"
                        style={{ fontSize: 13 }}
                      >
                        ${claim.reserve.toLocaleString()}
                      </span>
                    </td>

                    {/* SLA */}
                    <td style={{ padding: '13px 24px 13px 12px', textAlign: 'right' }}>
                      {slaUrgent ? (
                        <span
                          className="inline-flex items-center justify-end gap-1 font-bold tabular-nums rounded-md"
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            background: '#fef2f2',
                            color: '#7f1d1d',
                            border: '1px solid #fecaca',
                          }}
                        >
                          <ClockSmall />
                          {claim.slaDaysRemaining}d
                        </span>
                      ) : (
                        <span className="font-medium tabular-nums text-slate-400" style={{ fontSize: 12 }}>
                          {claim.slaDaysRemaining}d
                        </span>
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
  );
}
