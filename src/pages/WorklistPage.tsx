import type { Claim, ClaimStatus } from '../types';
import { claims } from '../data/claims';
import StatusBadge from '../components/StatusBadge';

interface Props {
  onSelectClaim: (claim: Claim) => void;
  claimStatusOverrides?: Record<string, ClaimStatus>;
}

/* ── Helpers ── */
const slaAtRiskCount = claims.filter(c => c.slaDaysRemaining <= 5).length;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const ADJUSTER_COLOR: Record<string, string> = {
  'Sarah Mitchell': '#1976d2',
  'James Torres':   '#4f46e5',
};

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
      <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M5.5 3v3l1.8 1.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
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

      <div className="flex items-center justify-between flex-1" style={{ padding: '18px 22px' }}>
        <div>
          {/* Label */}
          <p
            className="font-bold uppercase tracking-widest text-slate-400 leading-none mb-3"
            style={{ fontSize: 10 }}
          >
            {label}
          </p>
          {/* Value */}
          <p
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: 30, color: accent, letterSpacing: '-0.02em' }}
          >
            {value}
          </p>
          {/* Sub-chip */}
          <span
            className="inline-block font-semibold mt-2 rounded-md leading-none"
            style={{ fontSize: 11, padding: '3px 8px', background: subBg, color: subText }}
          >
            {sub}
          </span>
        </div>

        {/* Icon bubble */}
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 44,
            height: 44,
            background: subBg,
            color: accent,
          }}
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
          <p className="text-sm text-slate-400 mt-1.5 font-normal leading-relaxed">
            Select a claim below to open the Adjuster Workspace with QARL.
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
          {/* Table header bar */}
          <div
            className="flex items-center justify-between border-b"
            style={{ padding: '14px 24px', borderColor: '#f0f4f9' }}
          >
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-[#0f3460]" style={{ fontSize: 14 }}>
                Active Claims
              </h2>
              <span
                className="font-medium text-slate-400"
                style={{ fontSize: 12 }}
              >
                {claims.length} claims
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg"
              style={{ padding: '5px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
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
          <table
            className="w-full border-collapse"
            style={{ tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: 152 }} />
              <col />
              <col style={{ width: 136 }} />
              <col style={{ width: 116 }} />
              <col style={{ width: 148 }} />
              <col style={{ width: 172 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 88 }} />
            </colgroup>

            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f0f4f9' }}>
                {[
                  { label: 'Claim ID',    align: 'left'  as const, pl: 24 },
                  { label: 'Claimant',    align: 'left'  as const },
                  { label: 'Loss Type',   align: 'left'  as const },
                  { label: 'Date of Loss',align: 'left'  as const },
                  { label: 'Status',      align: 'left'  as const },
                  { label: 'Adjuster',    align: 'left'  as const },
                  { label: 'Reserve',     align: 'right' as const },
                  { label: 'SLA',         align: 'right' as const, pr: 24 },
                ].map(col => (
                  <th
                    key={col.label}
                    className="font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                    style={{
                      fontSize: 10,
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
                const status    = claimStatusOverrides?.[claim.id] ?? claim.status;
                const slaUrgent = claim.slaDaysRemaining <= 5;
                const adjColor  = ADJUSTER_COLOR[claim.assignedAdjuster] ?? '#475569';
                const adj       = initials(claim.assignedAdjuster);

                return (
                  <tr
                    key={claim.id}
                    onClick={() => onSelectClaim(claim)}
                    className="group relative cursor-pointer select-none transition-colors duration-100"
                    style={{
                      borderBottom: '1px solid #f0f4f9',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fbff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    {/* Hover accent line — absolute, left edge */}
                    <td
                      className="relative"
                      style={{ padding: '14px 12px 14px 24px' }}
                    >
                      <span
                        className="absolute left-0 top-0 h-full rounded-r opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                        style={{ width: 3, background: '#1976d2' }}
                        aria-hidden="true"
                      />
                      {/* Claim ID chip */}
                      <span
                        className="font-mono font-semibold rounded-lg inline-block"
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          background: '#eff6ff',
                          color: '#1976d2',
                          border: '1px solid #dbeafe',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {claim.id}
                      </span>
                    </td>

                    {/* Claimant */}
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        className="font-semibold text-[#0f3460] leading-snug block truncate"
                        style={{ fontSize: 13 }}
                      >
                        {claim.claimantName}
                      </span>
                    </td>

                    {/* Loss Type */}
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        className="font-medium rounded-md inline-block"
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {claim.lossType}
                      </span>
                    </td>

                    {/* Date of Loss */}
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        className="text-slate-500 tabular-nums"
                        style={{ fontSize: 12 }}
                      >
                        {claim.dateOfLoss}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 12px' }}>
                      <StatusBadge status={status} />
                    </td>

                    {/* Adjuster — avatar + name */}
                    <td style={{ padding: '14px 12px' }}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
                          style={{
                            width: 26,
                            height: 26,
                            background: adjColor,
                            fontSize: 9,
                            letterSpacing: '0.04em',
                            opacity: 0.85,
                          }}
                        >
                          {adj}
                        </div>
                        <span
                          className="text-slate-600 font-medium truncate"
                          style={{ fontSize: 12 }}
                        >
                          {claim.assignedAdjuster}
                        </span>
                      </div>
                    </td>

                    {/* Reserve — right-aligned */}
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <span
                        className="font-semibold tabular-nums text-[#0f3460]"
                        style={{ fontSize: 13 }}
                      >
                        ${claim.reserve.toLocaleString()}
                      </span>
                    </td>

                    {/* SLA — right-aligned, urgent pill or muted */}
                    <td style={{ padding: '14px 24px 14px 12px', textAlign: 'right' }}>
                      {slaUrgent ? (
                        <span
                          className="inline-flex items-center justify-end gap-1 font-semibold tabular-nums rounded-md"
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
                        <span
                          className="font-medium tabular-nums text-slate-400"
                          style={{ fontSize: 12 }}
                        >
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
