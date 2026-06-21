import type { Claim, ClaimStatus } from '../types';
import { claims } from '../data/claims';
import StatusBadge from '../components/StatusBadge';

interface Props {
  onSelectClaim: (claim: Claim) => void;
  claimStatusOverrides?: Record<string, ClaimStatus>;
}

const slaAtRiskCount = claims.filter(c => c.slaDaysRemaining <= 5).length;

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
              <span className="text-xs font-bold text-emerald-700 tracking-wide">All systems online</span>
            </div>
          </div>

          {/* 4-column fixed-layout table */}
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '46%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="pl-6 pr-4 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                  Claim
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                  Reserve
                </th>
                <th className="pl-4 pr-6 py-3 text-right text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                  SLA
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim, i) => {
                const status = claimStatusOverrides?.[claim.id] ?? claim.status;
                const slaUrgent = claim.slaDaysRemaining <= 5;
                return (
                  <tr
                    key={claim.id}
                    onClick={() => onSelectClaim(claim)}
                    className={`
                      group border-b border-slate-100 last:border-0
                      cursor-pointer select-none transition-colors duration-100
                      hover:bg-blue-50/60
                      ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                    `}
                    style={{ height: 48 }}
                  >
                    {/* Claim: name + id + loss-type pill */}
                    <td className="pl-6 pr-4 py-3 relative">
                      <span className="absolute left-0 top-0 h-full w-0.5 bg-[#1976d2] opacity-0 group-hover:opacity-100 transition-opacity duration-100 rounded-r" />
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="font-medium text-[#0f3460] leading-snug"
                          style={{ fontSize: 15 }}
                        >
                          {claim.claimantName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-slate-400 leading-none"
                            style={{ fontSize: 11 }}
                          >
                            {claim.id}
                          </span>
                          <span
                            className="font-semibold leading-none rounded"
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {claim.lossType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>

                    {/* Reserve — right-aligned */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-semibold text-[#0f3460] tabular-nums"
                        style={{ fontSize: 13 }}
                      >
                        ${claim.reserve.toLocaleString()}
                      </span>
                    </td>

                    {/* SLA — right-aligned, urgent style when ≤ 5 days */}
                    <td className="pl-4 pr-6 py-3 text-right">
                      <span
                        className="inline-flex items-center justify-end gap-1 tabular-nums font-semibold"
                        style={{ fontSize: 13, color: slaUrgent ? '#791F1F' : '#94a3b8' }}
                      >
                        {slaUrgent && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M6 3.5v2.7L7.8 7.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {claim.slaDaysRemaining}d
                      </span>
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
