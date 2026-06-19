import type { Claim } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  claim: Claim;
  onBack: () => void;
}

export default function ClaimContextHeader({ claim, onBack }: Props) {
  return (
    <div className="bg-white border-b border-slate-200 shrink-0" style={{ boxShadow: '0 1px 3px 0 rgba(15,52,96,0.06)' }}>
      <div className="flex items-stretch px-6 h-14">

        {/* Breadcrumb: ← Back to Worklist / Adjuster Workspace */}
        <div className="flex items-center gap-2 pr-5 mr-5 border-r border-slate-200 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#1976d2] hover:text-[#1256a0] text-[11px] font-bold transition-colors uppercase tracking-wider"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Worklist
          </button>
          <span className="text-slate-300 text-xs font-light select-none">/</span>
          <span className="text-[11px] font-bold text-[#0f3460] tracking-wide">Adjuster Workspace</span>
        </div>

        {/* Claim metadata fields */}
        <div className="flex items-center gap-6 flex-1 min-w-0">

          <MetaField label="Claim ID" value={claim.id} mono />
          <Sep />
          <MetaField label="Claimant" value={claim.claimantName} />
          <Sep />
          <MetaField label="Policy #" value={claim.policyNumber} mono />
          <Sep />
          <MetaField label="Loss Type" value={claim.lossType} />
          <Sep />
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status</span>
            <StatusBadge status={claim.status} />
          </div>

          {/* SLA — pushed right */}
          <div className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#d97706" strokeWidth="1.3"/>
              <path d="M6 3.5v2.8l1.8 1.8" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px] font-bold text-amber-700 whitespace-nowrap">
              SLA: {claim.slaDaysRemaining} days remaining
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</span>
      <span className={`text-[13px] font-bold text-[#0f3460] leading-none ${mono ? 'font-mono tracking-tight' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <div className="shrink-0 w-px bg-slate-200" style={{ height: 28 }} />
  );
}
