import { useState } from 'react';
import type { Claim, ChatMessage } from '../types';
import ClaimContextHeader from '../components/ClaimContextHeader';
import ChatPanel from '../components/ChatPanel';
import EmailModal from '../components/EmailModal';
import { buildEmailDraft } from '../data/conversation';

interface Props {
  claim: Claim;
  onBack: () => void;
  onViewJourney: () => void;
  onViewDocumentation: () => void;
  conversationState?: { messages: ChatMessage[]; step: number };
  onConversationUpdate: (messages: ChatMessage[], step: number) => void;
  journeyEverOpened: boolean;
}

function SectionHeader({
  title,
  badge,
}: {
  title: string;
  badge?: { label: string; color: 'emerald' | 'amber' };
}) {
  const badgeClass =
    badge?.color === 'emerald'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div
      className="px-5 py-3 flex items-center justify-between border-b border-slate-100"
      style={{ background: 'rgba(248,250,252,0.9)' }}
    >
      <h3
        className="font-black text-slate-400 uppercase leading-none"
        style={{ fontSize: 9, letterSpacing: '0.14em' }}
      >
        {title}
      </h3>
      {badge && (
        <span
          className={`font-bold border rounded-full uppercase leading-none ${badgeClass}`}
          style={{ fontSize: 9, letterSpacing: '0.06em', padding: '2px 8px' }}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <dt
        className="font-semibold text-slate-400 uppercase shrink-0 leading-none"
        style={{ fontSize: 9, letterSpacing: '0.1em' }}
      >
        {label}
      </dt>
      <dd
        className={`font-semibold text-right leading-tight text-[#0f3460] ${mono ? 'font-mono' : ''}`}
        style={{ fontSize: 13 }}
      >
        {value}
      </dd>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div
        className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
        style={{ width: 20, height: 20 }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8.5 2" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="font-medium text-slate-700 leading-tight" style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

const CARD_STYLE = {
  boxShadow: '0 1px 3px rgba(15,52,96,0.06), 0 4px 12px rgba(15,52,96,0.04)',
  minHeight: 130,
};

export default function ClaimDetailPage({ claim, onBack, onViewJourney, onViewDocumentation, conversationState, onConversationUpdate, journeyEverOpened }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const reserveIncreased = claim.reserve > claim.initialReserve;

  const handleSend = () => {
    setShowEmail(false);
    setEmailSent(true);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ClaimContextHeader claim={claim} onBack={onBack} />

      <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-100 p-6 gap-5">

        {/* ── Left panel · 40% ── */}
        <div className="w-[40%] shrink-0 overflow-y-auto space-y-4">

          {/* Policy & Coverage */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={CARD_STYLE}>
            <SectionHeader title="Policy & Coverage" />
            <dl className="px-5 pt-2 pb-3">
              <InfoRow label="Account"      value={claim.claimantName} />
              <InfoRow label="Policy #"     value={claim.policyNumber} mono />
              <InfoRow label="Date of Loss" value={claim.dateOfLoss} />
              <InfoRow label="Loss Type"    value={claim.lossType} />
            </dl>
          </div>

          {/* Coverage Verification */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={CARD_STYLE}>
            <SectionHeader title="Coverage Verification" badge={{ label: 'Confirmed', color: 'emerald' }} />
            <div className="px-5 pt-2 pb-3">
              <CheckItem text={`${claim.lossType} Coverage — Active`} />
              <CheckItem text="Policy in Force — Verified" />
            </div>
          </div>

          {/* Reserve Summary */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={CARD_STYLE}>
            <SectionHeader title="Reserve Summary" />
            <div className="px-5 pt-4 pb-5">

              {/* Initial row */}
              <div className="flex justify-between items-baseline mb-3">
                <span
                  className="font-semibold text-slate-400 uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.1em' }}
                >
                  Initial Reserve
                </span>
                <span className="font-medium tabular-nums text-slate-400" style={{ fontSize: 13 }}>
                  ${claim.initialReserve.toLocaleString()}
                </span>
              </div>

              {/* Separator with label */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">current</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* Current reserve — focal point */}
              <div className="flex justify-between items-baseline mb-3">
                <span
                  className="font-semibold text-slate-500 uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.1em' }}
                >
                  Reserve
                </span>
                <span
                  className="font-black text-[#0f3460] tabular-nums"
                  style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1 }}
                >
                  ${claim.reserve.toLocaleString()}
                </span>
              </div>

              {reserveIncreased && (
                <div
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mt-1"
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="#d97706" strokeWidth="1.3"/>
                    <path d="M6.5 3.5v3.5l2 2" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-bold text-amber-700 leading-tight" style={{ fontSize: 10 }}>
                    Increased {claim.dateOfLoss} · Pending approval
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Claim Details */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={CARD_STYLE}>
            <SectionHeader title="Claim Details" />
            <dl className="px-5 pt-2 pb-3">
              <InfoRow label="Claim ID"      value={claim.id} mono />
              <InfoRow label="Assigned To"   value={claim.assignedAdjuster} />
              <InfoRow label="SLA Remaining" value={`${claim.slaDaysRemaining} days`} />
            </dl>
          </div>

        </div>

        {/* ── Right panel · QARL · 60% ── */}
        <div
          className="flex-1 flex flex-col min-h-0 min-w-0 rounded-2xl border border-slate-200 bg-white overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}
        >
          <ChatPanel
            claim={claim}
            onGetEmail={() => setShowEmail(true)}
            emailSent={emailSent}
            onViewJourney={onViewJourney}
            onViewDocumentation={onViewDocumentation}
            initialMessages={conversationState?.messages}
            initialStep={conversationState?.step}
            onUpdate={onConversationUpdate}
            journeyEverOpened={journeyEverOpened}
          />
        </div>

      </div>

      {showEmail && (
        <EmailModal
          draft={buildEmailDraft(claim)}
          onClose={() => setShowEmail(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
