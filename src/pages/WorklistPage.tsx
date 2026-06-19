import type { Claim, ClaimStatus } from '../types';
import { claims } from '../data/claims';
import StatusBadge from '../components/StatusBadge';

interface Props {
  onSelectClaim: (claim: Claim) => void;
  claimStatusOverrides?: Record<string, ClaimStatus>;
}

const stats = [
  {
    label: 'Open Claims',
    value: '3',
    sub: 'Assigned to you',
    valueColor: 'text-[#1976d2]',
    subColor: 'text-blue-600',
    subBg: 'bg-blue-50',
    accent: 'bg-[#1976d2]',
    dot: 'bg-blue-500',
  },
  {
    label: 'SLA at Risk',
    value: '1',
    sub: 'Due within 5 days',
    valueColor: 'text-amber-600',
    subColor: 'text-amber-700',
    subBg: 'bg-amber-50',
    accent: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  {
    label: 'Avg. Reserve',
    value: '$187K',
    sub: 'Across active claims',
    valueColor: 'text-[#0f3460]',
    subColor: 'text-slate-500',
    subBg: 'bg-slate-100',
    accent: 'bg-[#0f3460]',
    dot: 'bg-slate-400',
  },
];

export default function WorklistPage({ onSelectClaim, claimStatusOverrides }: Props) {
  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      {/* Centered enterprise container — max 1600px, 32px gutters */}
      <div className="max-w-[1600px] mx-auto px-8 pt-10 pb-12">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-[1.75rem] font-bold text-[#0f3460] tracking-tight leading-tight">
            Claims Worklist
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-normal leading-relaxed">
            Select a claim below to open the Adjuster Workspace with QARL.
          </p>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-3 gap-5 mb-7">
          {stats.map(s => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden flex flex-col"
            >
              {/* Colored top accent line */}
              <div className={`h-1 w-full ${s.accent}`} />

              <div className="px-5 py-4 flex flex-col gap-1.5">
                {/* Label row */}
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {s.label}
                  </span>
                </div>
                {/* Value — vertically centered with sub */}
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className={`text-3xl font-bold tracking-tight ${s.valueColor}`}>
                    {s.value}
                  </span>
                  <span className={`text-xs font-semibold ${s.subColor} ${s.subBg} px-2 py-0.5 rounded-md`}>
                    {s.sub}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">

          {/* Table card header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-bold text-[#0f3460] leading-tight">Active Claims</h2>
              <p className="text-xs text-slate-400 leading-tight">
                {claims.length} claims&nbsp;&nbsp;·&nbsp;&nbsp;Click a row to open workspace
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-700 tracking-wide">QARL Ready</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Claim ID', 'Claimant', 'Loss Type',
                  'Date of Loss', 'Status', 'Adjuster', 'Reserve', 'SLA',
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap
                      ${i === 0 ? 'pl-6 pr-4' : i === 6 ? 'pl-4 pr-6 text-right' : 'px-4'}
                    `}
                    style={{ textAlign: i === 6 ? 'right' : 'left' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map((claim, i) => (
                <tr
                  key={claim.id}
                  onClick={() => onSelectClaim(claim)}
                  className={`
                    group relative border-b border-slate-100 last:border-0
                    cursor-pointer select-none
                    transition-all duration-150
                    hover:bg-blue-50/70
                    ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                  `}
                >
                  {/* Left hover accent */}
                  <td className="pl-6 pr-4 py-3.5 relative">
                    <span className="absolute left-0 top-0 h-full w-0.5 bg-[#1976d2] opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-r" />
                    <span className="inline-flex items-center font-mono text-[11px] font-bold text-[#1976d2] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg tracking-tight">
                      {claim.id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-[#0f3460]">{claim.claimantName}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{claim.lossType}</td>
                  <td className="px-4 py-3.5 text-slate-500 tabular-nums">{claim.dateOfLoss}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={claimStatusOverrides?.[claim.id] ?? claim.status} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{claim.assignedAdjuster}</td>
                  <td className="pl-4 pr-6 py-3.5 text-right">
                    <span className="font-bold text-[#0f3460] tabular-nums">
                      ${claim.reserve.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`
                      inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full tabular-nums
                      ${claim.slaDaysRemaining <= 5
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'}
                    `}>
                      {claim.slaDaysRemaining}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
