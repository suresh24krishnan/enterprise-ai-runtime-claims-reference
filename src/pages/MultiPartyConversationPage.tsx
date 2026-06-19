import { useState, useEffect } from 'react';
import type { Claim } from '../types';

interface DocumentationPackage {
  participants: string[];
  assessment: string[];
  recommendation: string;
  confidence: number;
  reserveAmount: number;
}

interface Props {
  claim: Claim;
  onBack: () => void;
  onPackageImported: (pkg: DocumentationPackage) => void;
  onNavigateToDocumentation: () => void;
  initialSummaryGenerated: boolean;
  initialDocAdded: boolean;
  onSummaryGenerated: () => void;
}

/* ── Design tokens ── */
const BLUE       = '#1976d2';
const NAVY       = '#0f3460';
const CARD_SHADOW = '0 1px 4px rgba(15,52,96,0.06), 0 6px 20px rgba(15,52,96,0.07)';

/* ── Participant definitions ── */
function buildParticipants(claim: Claim) {
  const adjusterInitials = claim.assignedAdjuster.split(' ').map((n: string) => n[0]).join('');
  const claimantInitials = claim.claimantName.split(' ').map((n: string) => n[0]).slice(0, 2).join('');
  return [
    { key: 'adjuster',   initials: adjusterInitials,  name: claim.assignedAdjuster,  role: 'Claims Adjuster',    status: 'Active',       color: NAVY   },
    { key: 'qarl',       initials: 'Q',               name: 'QARL',                  role: 'AI Claims Assistant',status: 'Coordinating', color: BLUE   },
    { key: 'ia',         initials: 'IA',              name: 'Independent Adjuster',  role: 'Field Assessment',   status: 'Responded',    color: '#475569' },
    { key: 'cs',         initials: 'CS',              name: 'Coverage Specialist',   role: 'Coverage Review',    status: 'Reviewed',     color: '#475569' },
    { key: 'claimant',   initials: claimantInitials,  name: claim.claimantName,      role: 'Loss Clarification', status: 'Responded',    color: '#475569' },
    { key: 'supervisor', initials: 'SV',              name: 'Supervisor',            role: 'Review Queue',       status: 'Pending',      color: '#b45309' },
  ];
}

/* ── Conversation thread ── */
function buildThread(claim: Claim) {
  return [
    {
      id: 'msg-1',
      sender: 'adjuster',
      name: claim.assignedAdjuster,
      role: 'Claims Adjuster',
      time: '09:14 AM',
      text: 'Identify other loss details.',
      type: 'adjuster' as const,
      isQARL: false,
    },
    {
      id: 'msg-2',
      sender: 'qarl',
      name: 'QARL',
      role: 'AI Claims Assistant',
      time: '09:14 AM',
      text: "I'll coordinate the review and gather inputs from the independent adjuster, claimant, and coverage specialist.",
      type: 'qarl' as const,
      isQARL: true,
    },
    {
      id: 'msg-3',
      sender: 'ia',
      name: 'Independent Adjuster',
      role: 'Field Assessment',
      time: '09:17 AM',
      text: 'Damage assessment indicates additional structural and equipment exposure beyond the initial FNOL.',
      type: 'external' as const,
      isQARL: false,
    },
    {
      id: 'msg-4',
      sender: 'cs',
      name: 'Coverage Specialist',
      role: 'Coverage Review',
      time: '09:21 AM',
      text: 'Coverage review confirms the additional applicable loss should be evaluated under the selected policy.',
      type: 'external' as const,
      isQARL: false,
    },
    {
      id: 'msg-5',
      sender: 'claimant',
      name: claim.claimantName,
      role: 'Loss Clarification',
      time: '09:24 AM',
      text: 'Additional damage was discovered after the initial report, including equipment and exterior property exposure.',
      type: 'external' as const,
      isQARL: false,
    },
    {
      id: 'msg-6',
      sender: 'supervisor',
      name: 'Supervisor',
      role: 'Review Queue',
      time: '09:31 AM',
      text: 'Proceed with review package and queue for documentation update.',
      type: 'supervisor' as const,
      isQARL: false,
    },
    {
      id: 'msg-7',
      sender: 'qarl',
      name: 'QARL',
      role: 'AI Summary',
      time: '09:32 AM',
      text: 'Potential additional exposure identified. Damage assessment received, coverage relevance confirmed, and documentation package updated for review.',
      type: 'summary' as const,
      isQARL: true,
    },
  ];
}

const SUMMARY_ITEMS = [
  { label: 'Assessment', value: 'Damage Assessment' },
  { label: 'Type',       value: 'Additional Applicable Loss' },
  { label: 'Result',     value: 'Potential additional exposure identified' },
  { label: 'Status',     value: 'Ready for Documentation' },
];

const SOURCE_INPUTS = ['Independent Adjuster', 'Coverage Specialist', 'Claimant', 'ClaimCenter Context'];

const CHECKLIST = [
  'Additional loss details collected',
  'Damage assessment received',
  'Coverage relevance confirmed',
  'Supervisor review queued',
  'Documentation package updated',
];

const PARTICIPANT_COLORS: Record<string, string> = {
  adjuster:   NAVY,
  qarl:       BLUE,
  ia:         '#0f766e',
  cs:         '#7c3aed',
  claimant:   '#0369a1',
  supervisor: '#b45309',
};

/* ═══════════════════════════════════════════
   Main page
═══════════════════════════════════════════ */
export default function MultiPartyConversationPage({ claim, onBack, onPackageImported, onNavigateToDocumentation, initialSummaryGenerated, initialDocAdded, onSummaryGenerated }: Props) {
  const [summaryHighlighted, setSummaryHighlighted] = useState(initialSummaryGenerated);
  const [summaryGenerated,   setSummaryGenerated]   = useState(initialSummaryGenerated);
  const [docAdded,           setDocAdded]           = useState(initialDocAdded);

  const participants = buildParticipants(claim);
  const thread       = buildThread(claim);

  const handleGenerateSummary = () => {
    setSummaryHighlighted(true);
    setSummaryGenerated(true);
    onSummaryGenerated();
  };

  const handleAddToPackage = () => {
    if (!summaryGenerated || docAdded) return;
    const pkg: DocumentationPackage = {
      participants: ['Independent Adjuster', 'Coverage Specialist', 'Claimant', 'Supervisor'],
      assessment: [
        'Additional structural damage identified',
        'Coverage review confirms additional applicable loss',
        'Claimant confirmed equipment exposure',
        'Documentation package ready for review',
      ],
      recommendation: `Increase reserve recommendation to $${claim.reserve.toLocaleString()}. Coverage remains active. Assignment email prepared. Claim note ready for review.`,
      confidence: 94,
      reserveAmount: claim.reserve,
    };
    setDocAdded(true);
    onPackageImported(pkg);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#f1f5f9' }}>

      {/* ── Header ── */}
      <PageHeader claim={claim} onBack={onBack} />

      {/* ── Three-column workspace ── */}
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ padding: '20px 32px', gap: 16 }}
      >
        {/* Left — Participants */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 220 }}>
          <ParticipantsPanel participants={participants} />
        </div>

        {/* Center — Conversation timeline */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <ConversationTimeline
            thread={thread}
            summaryHighlighted={summaryHighlighted}
            participantColors={PARTICIPANT_COLORS}
          />
        </div>

        {/* Right — QARL coordination summary */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 264 }}>
          <SummaryPanel
            claim={claim}
            summaryHighlighted={summaryHighlighted}
            summaryGenerated={summaryGenerated}
          />
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <ActionBar
        summaryGenerated={summaryGenerated}
        docAdded={docAdded}
        onGenerateSummary={handleGenerateSummary}
        onAddToPackage={handleAddToPackage}
        onReturn={onBack}
        onNavigateToDoc={onNavigateToDocumentation}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page header
═══════════════════════════════════════════ */
function PageHeader({ claim, onBack }: { claim: Claim; onBack: () => void }) {
  return (
    <div
      className="shrink-0 border-b border-slate-200"
      style={{ background: '#fff', padding: '0 32px', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}
    >
      <div style={{ paddingTop: 18, paddingBottom: 16 }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-[#1976d2] transition-colors mb-3 font-semibold"
          style={{ fontSize: 12 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Journey
        </button>

        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-black uppercase mb-0.5" style={{ fontSize: 9, letterSpacing: '0.18em', color: BLUE }}>
              AI Capability · Step 2 of 5
            </p>
            <h1 className="font-black leading-tight" style={{ fontSize: 22, color: NAVY, letterSpacing: '-0.02em' }}>
              Multi-Party Conversations
            </h1>
            <p className="font-semibold text-slate-500 mt-1" style={{ fontSize: 12 }}>
              Investigation & Evaluation
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-semibold text-slate-500" style={{ fontSize: 12 }}>{claim.claimantName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-slate-400" style={{ fontSize: 11 }}>{claim.id}</span>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-500" style={{ fontSize: 12 }}>{claim.lossType}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge label="Claim Scoped" color="slate" />
            <Badge label="QARL Orchestrated" color="blue" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'blue' | 'slate' | 'emerald' | 'amber' }) {
  const s = {
    blue:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    slate:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    emerald: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    amber:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  }[color];
  return (
    <span
      className="font-black rounded-full border uppercase"
      style={{ fontSize: 9, letterSpacing: '0.10em', padding: '3px 12px', background: s.bg, color: s.text, borderColor: s.border }}
    >
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   Left: Participants panel
═══════════════════════════════════════════ */
interface Participant {
  key: string; initials: string; name: string; role: string; status: string; color: string;
}

function ParticipantsPanel({ participants }: { participants: Participant[] }) {
  const statusStyle = (s: string) => {
    if (s === 'Active')       return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' };
    if (s === 'Coordinating') return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: BLUE };
    if (s === 'Responded')    return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' };
    if (s === 'Reviewed')     return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' };
    if (s === 'Pending')      return { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' };
    return                           { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
      {/* Header */}
      <div className="border-b border-slate-100" style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}>
        <p className="font-black text-slate-400 uppercase" style={{ fontSize: 9, letterSpacing: '0.14em' }}>
          Participants · {participants.length}
        </p>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100">
        {participants.map(p => {
          const ss = statusStyle(p.status);
          const isQARL = p.key === 'qarl';
          return (
            <div key={p.key} className="flex items-start gap-3" style={{ padding: '12px 16px' }}>
              {/* Avatar */}
              <div
                className="rounded-xl flex items-center justify-center shrink-0 font-black text-white"
                style={{
                  width: 32, height: 32, fontSize: 10,
                  background: isQARL
                    ? `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`
                    : p.color,
                  boxShadow: isQARL ? '0 2px 6px rgba(25,118,210,0.28)' : 'none',
                }}
              >
                {p.initials}
              </div>

              {/* Name + role + status */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#0f3460] leading-tight truncate" style={{ fontSize: 11 }}>
                  {p.name}
                </p>
                <p className="font-medium text-slate-400 leading-tight mt-0.5" style={{ fontSize: 9 }}>
                  {p.role}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="rounded-full shrink-0"
                    style={{ width: 5, height: 5, background: ss.dot, ...(p.status === 'Coordinating' ? { boxShadow: `0 0 4px ${ss.dot}` } : {}) }}
                  />
                  <span
                    className="font-bold rounded-full border"
                    style={{ fontSize: 8, letterSpacing: '0.06em', padding: '1px 6px', background: ss.bg, color: ss.text, borderColor: ss.border }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Center: Conversation timeline
═══════════════════════════════════════════ */
type MsgType = 'adjuster' | 'qarl' | 'external' | 'supervisor' | 'summary';

interface ThreadMsg {
  id: string; sender: string; name: string; role: string; time: string;
  text: string; type: MsgType; isQARL: boolean;
}

function ConversationTimeline({
  thread, summaryHighlighted, participantColors,
}: {
  thread: ThreadMsg[];
  summaryHighlighted: boolean;
  participantColors: Record<string, string>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-slate-100"
        style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 9.5V3a1 1 0 011-1h6a1 1 0 011 1v5a1 1 0 01-1 1H4.5L2 9.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>
            Coordination Thread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-400 shrink-0 animate-pulse" style={{ width: 6, height: 6 }} />
          <span className="font-bold text-emerald-700" style={{ fontSize: 10 }}>
            {thread.length} exchanges
          </span>
        </div>
      </div>

      {/* Thread entries */}
      <div style={{ padding: '16px 20px 20px' }} className="space-y-3">
        {thread.map((msg, idx) => (
          <ThreadEntry
            key={msg.id}
            msg={msg}
            isLast={idx === thread.length - 1}
            highlighted={msg.type === 'summary' && summaryHighlighted}
            accentColor={participantColors[msg.sender] ?? '#475569'}
          />
        ))}
      </div>
    </div>
  );
}

function ThreadEntry({
  msg, isLast, highlighted, accentColor,
}: {
  msg: ThreadMsg; isLast: boolean; highlighted: boolean; accentColor: string;
}) {
  const isSummary = msg.type === 'summary';

  const cardBg     = isSummary ? (highlighted ? NAVY : '#0f2952') : '#fff';
  const cardBorder = isSummary
    ? (highlighted ? `2px solid ${BLUE}` : '1.5px solid rgba(255,255,255,0.12)')
    : `1.5px solid ${highlighted ? BLUE : '#f1f5f9'}`;

  const avatarBg = msg.sender === 'qarl'
    ? `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`
    : accentColor;

  const initials = isSummary ? 'Q' :
    msg.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('');

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: cardBorder,
        background: cardBg,
        boxShadow: isSummary
          ? (highlighted ? `0 4px 20px rgba(25,118,210,0.28)` : '0 2px 10px rgba(15,52,96,0.20)')
          : '0 1px 4px rgba(15,52,96,0.04)',
        transition: 'box-shadow 0.4s ease, border 0.4s ease',
        marginBottom: isLast ? 0 : undefined,
      }}
    >
      {/* Entry header */}
      <div
        className="flex items-center gap-2.5"
        style={{
          padding: '10px 14px 8px',
          borderBottom: isSummary ? '1px solid rgba(255,255,255,0.10)' : '1px solid #f1f5f9',
        }}
      >
        {/* Avatar */}
        <div
          className="rounded-lg flex items-center justify-center shrink-0 font-black text-white"
          style={{ width: 24, height: 24, fontSize: 9, background: avatarBg }}
        >
          {initials}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-black leading-none"
              style={{ fontSize: 11, color: isSummary ? '#fff' : NAVY }}
            >
              {msg.name}
            </span>
            {isSummary && (
              <span
                className="rounded-full bg-blue-500 text-white font-black uppercase"
                style={{ fontSize: 7, letterSpacing: '0.10em', padding: '1px 6px' }}
              >
                AI Summary
              </span>
            )}
          </div>
          <span
            className="font-medium leading-none"
            style={{ fontSize: 9, color: isSummary ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}
          >
            {msg.role}
          </span>
        </div>

        {/* Time */}
        <span
          className="font-medium shrink-0"
          style={{ fontSize: 9, color: isSummary ? 'rgba(255,255,255,0.40)' : '#cbd5e1' }}
        >
          {msg.time}
        </span>
      </div>

      {/* Message body */}
      <div style={{ padding: '10px 14px 12px' }}>
        <p
          className="font-medium leading-relaxed"
          style={{ fontSize: 12, color: isSummary ? 'rgba(255,255,255,0.88)' : '#374151' }}
        >
          {isSummary && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 6 }}
            >
              <span
                className="rounded-full bg-emerald-400 shrink-0 inline-block"
                style={{ width: 7, height: 7 }}
              />
            </span>
          )}
          {msg.text}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Right: QARL coordination summary
═══════════════════════════════════════════ */
const GENERATED_PARTICIPANTS = ['Independent Adjuster', 'Coverage Specialist', 'Claimant', 'Supervisor'];
const GENERATED_ASSESSMENT = [
  'Additional structural damage identified',
  'Coverage review confirms additional applicable loss',
  'Claimant confirmed equipment exposure',
  'Documentation package ready for review',
];

function SummaryPanel({ claim, summaryHighlighted, summaryGenerated }: {
  claim: Claim; summaryHighlighted: boolean; summaryGenerated: boolean;
}) {
  const [contentVisible, setContentVisible] = useState(summaryGenerated);

  useEffect(() => {
    if (summaryGenerated) {
      const t = setTimeout(() => setContentVisible(true), 30);
      return () => clearTimeout(t);
    }
  }, [summaryGenerated]);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          boxShadow: summaryHighlighted
            ? `${CARD_SHADOW}, 0 0 0 2px rgba(25,118,210,0.20)`
            : CARD_SHADOW,
          borderColor: summaryHighlighted ? '#bfdbfe' : '#e2e8f0',
          background: '#fff',
          transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 border-b border-slate-100"
          style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}
        >
          <div
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2"/>
              <path d="M4 6l1.5 1.5L8.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-black text-[#0f3460]" style={{ fontSize: 11 }}>
            QARL Coordination Summary
          </p>
          {summaryGenerated && (
            <span
              className="ml-auto font-black rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase"
              style={{ fontSize: 7, letterSpacing: '0.10em', padding: '2px 8px' }}
            >
              Generated
            </span>
          )}
        </div>

        {/* Summary items — static before generation, enriched after */}
        {!summaryGenerated ? (
          <div style={{ padding: '14px 16px 12px' }} className="space-y-3">
            {SUMMARY_ITEMS.map(item => (
              <div key={item.label}>
                <p className="font-black text-slate-400 uppercase mb-1" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
                  {item.label}
                </p>
                <p className="font-semibold text-[#0f3460] leading-snug" style={{ fontSize: 11 }}>
                  {item.value}
                </p>
              </div>
            ))}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-black text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.12em' }}>Confidence</p>
                <span className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>94%</span>
              </div>
              <div className="rounded-full bg-slate-100 overflow-hidden" style={{ height: 5 }}>
                <div className="rounded-full h-full" style={{ width: '94%', background: `linear-gradient(to right, ${BLUE}, ${NAVY})`, transition: 'width 1s ease' }} />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '14px 16px 12px',
              opacity: contentVisible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            className="space-y-3"
          >
            {/* Participants Consulted */}
            <div>
              <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
                Participants Consulted
              </p>
              <div className="space-y-1.5">
                {GENERATED_PARTICIPANTS.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0" style={{ width: 14, height: 14 }}>
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-medium text-slate-600" style={{ fontSize: 10 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment */}
            <div>
              <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
                Assessment
              </p>
              <div className="space-y-1">
                {GENERATED_ASSESSMENT.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center" style={{ width: 14, height: 14, fontSize: 7, marginTop: 1 }}>{i + 1}</span>
                    <span className="font-medium text-slate-600 leading-snug" style={{ fontSize: 10 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div>
              <p className="font-black text-slate-400 uppercase mb-1" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
                AI Recommendation
              </p>
              <p className="font-semibold text-[#0f3460] leading-snug" style={{ fontSize: 10 }}>
                Increase reserve recommendation to ${claim.reserve.toLocaleString()}. Coverage remains active. Assignment email prepared. Claim note ready for review.
              </p>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-black text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.12em' }}>Confidence</p>
                <span className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>94%</span>
              </div>
              <div className="rounded-full bg-slate-100 overflow-hidden" style={{ height: 5 }}>
                <div className="rounded-full h-full" style={{ width: '94%', background: `linear-gradient(to right, ${BLUE}, ${NAVY})`, transition: 'width 1s ease' }} />
              </div>
            </div>
          </div>
        )}

        {/* Source inputs */}
        <div
          className="border-t border-slate-100"
          style={{ padding: '10px 16px 12px', background: 'rgba(248,250,252,0.6)' }}
        >
          <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
            Source Inputs
          </p>
          <div className="space-y-1.5">
            {SOURCE_INPUTS.map(src => (
              <div key={src} className="flex items-center gap-2">
                <div
                  className="rounded-full bg-blue-100 flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14 }}
                >
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                    <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke={BLUE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-slate-600" style={{ fontSize: 10 }}>{src}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Claim context */}
        <div className="border-t border-slate-100" style={{ padding: '10px 16px 12px', background: 'rgba(239,246,255,0.5)' }}>
          <p className="font-black text-slate-400 uppercase mb-1" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
            Claim Context
          </p>
          <p className="font-black text-[#0f3460] leading-tight" style={{ fontSize: 11 }}>
            {claim.claimantName}
          </p>
          <p className="font-mono text-slate-400 mt-0.5" style={{ fontSize: 10 }}>
            {claim.id} · {claim.lossType}
          </p>
        </div>
      </div>

      {/* Action checklist */}
      <div
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="border-b border-slate-100" style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}>
          <p className="font-black text-slate-400 uppercase" style={{ fontSize: 9, letterSpacing: '0.14em' }}>
            Action Checklist
          </p>
        </div>
        <div style={{ padding: '10px 16px 12px' }} className="space-y-2.5">
          {CHECKLIST.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5"
                style={{ width: 16, height: 16 }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-medium text-slate-700 leading-snug" style={{ fontSize: 11 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Bottom action bar
═══════════════════════════════════════════ */
function ActionBar({
  summaryGenerated, docAdded, onGenerateSummary, onAddToPackage, onReturn, onNavigateToDoc,
}: {
  summaryGenerated: boolean;
  docAdded: boolean;
  onGenerateSummary: () => void;
  onAddToPackage: () => void;
  onReturn: () => void;
  onNavigateToDoc: () => void;
}) {
  const addDisabled = docAdded || !summaryGenerated;
  const addLabel = docAdded
    ? 'Added ✓'
    : !summaryGenerated
    ? 'Generate AI Summary first'
    : 'Add to Documentation Package';

  return (
    <div
      className="shrink-0 border-t border-slate-200"
      style={{ background: '#fff', padding: '12px 32px', boxShadow: '0 -1px 4px rgba(15,52,96,0.04)' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Success message */}
        <div style={{ minWidth: 260 }}>
          {docAdded && (
            <div
              className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200"
              style={{ padding: '8px 14px', display: 'inline-flex' }}
            >
              <div
                className="rounded-full bg-emerald-200 flex items-center justify-center shrink-0"
                style={{ width: 18, height: 18 }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5l2 2L7.5 2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-emerald-800" style={{ fontSize: 12 }}>
                Multi-party clarification added to the documentation package.
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGenerateSummary}
            disabled={summaryGenerated}
            className="flex items-center gap-2 font-bold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: 12, padding: '9px 20px' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 6.5l1.5 1.5L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {summaryGenerated ? 'Summary Generated ✓' : 'Generate Summary'}
          </button>

          <button
            onClick={onAddToPackage}
            disabled={addDisabled}
            className="flex items-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontSize: 12, padding: '9px 20px',
              background: docAdded ? '#e2e8f0' : addDisabled ? '#e2e8f0' : BLUE,
              color: addDisabled ? '#94a3b8' : '#fff',
              boxShadow: addDisabled ? 'none' : '0 2px 8px rgba(25,118,210,0.28)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6.5 4v5M4 6.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {addLabel}
          </button>

          <div className="w-px h-6 bg-slate-200" />

          {docAdded ? (
            <button
              onClick={onNavigateToDoc}
              className="flex items-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97]"
              style={{ fontSize: 12, padding: '9px 20px', background: NAVY, color: '#fff', boxShadow: '0 2px 8px rgba(15,52,96,0.28)' }}
            >
              Review Documentation
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={onReturn}
              className="flex items-center gap-2 font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.97]"
              style={{ fontSize: 12, padding: '9px 20px' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2.5L3.5 7 8 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Return to Journey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
