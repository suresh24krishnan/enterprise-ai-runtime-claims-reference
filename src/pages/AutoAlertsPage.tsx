import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { Claim } from '../types';

/* ── Local structural types (avoids circular imports) ── */
interface DocumentationPackage {
  participants: string[];
  assessment: string[];
  recommendation: string;
  confidence: number;
  reserveAmount: number;
  enrichment?: { confidence: number; result: string; type: string; rom: string };
  alerts?: AlertPackage;
}

export interface AlertPackage {
  confidence: number;
  alertsCount: number;
  communicationDrafted: boolean;
}

interface Props {
  claim: Claim;
  onBack: () => void;
  docPackage?: DocumentationPackage | null;
  onAlertAdded: (alerts: AlertPackage) => void;
  onNavigateToDocumentation: () => void;
  initialAlertsRun: boolean;
  initialAlertsAdded: boolean;
  onAlertsRun: () => void;
}

/* ── Design tokens ── */
const BLUE = '#1976d2';
const NAVY = '#0f3460';
const CARD_SHADOW = '0 1px 4px rgba(15,52,96,0.06), 0 6px 20px rgba(15,52,96,0.07)';

/* ── Card timings ── */
const EXEC_TIMES  = ['312 ms', '398 ms', '441 ms', '367 ms', '523 ms'];
const TIMESTAMPS  = ['09:15:01', '09:15:02', '09:15:03', '09:15:04', '09:15:05'];

const ACTIVITY_LOG = [
  { time: '09:15:01', text: 'Claim file notice prepared' },
  { time: '09:15:02', text: 'Future alert scheduled' },
  { time: '09:15:03', text: 'Agent email drafted' },
  { time: '09:15:04', text: 'Supervisor notification queued' },
  { time: '09:15:05', text: 'SLA monitoring activated' },
  { time: '09:15:06', text: 'Documentation package updated' },
  { time: '09:15:07', text: 'Interactive Documentation synchronized' },
];

/* ── Alert card definition ── */
interface AlertCardDef {
  id: string;
  title: string;
  completedStatus: string;
  statusColor: 'green' | 'blue' | 'amber';
  icon: ReactNode;
  description: (claim: Claim) => string;
  output: string;
}

const ALERT_CARDS: AlertCardDef[] = [
  {
    id: 'notice',
    title: 'Claim File Notice',
    completedStatus: 'Prepared',
    statusColor: 'green',
    icon: <FileIcon />,
    description: (c) => `Claim file notice prepared for ${c.claimantName} (${c.id}).`,
    output: 'Notice ready for adjuster review.',
  },
  {
    id: 'future-alert',
    title: 'Future Alert',
    completedStatus: 'Scheduled',
    statusColor: 'green',
    icon: <CalendarIcon />,
    description: (c) => `Future alert created based on SLA and claim status. Follow-up due in ${c.slaDaysRemaining} business days.`,
    output: 'Follow-up reminder aligned to SLA.',
  },
  {
    id: 'agent-comm',
    title: 'Agent Communication',
    completedStatus: 'Drafted',
    statusColor: 'blue',
    icon: <MailDraftIcon />,
    description: () => 'Agent update email prepared with current claim status and coverage summary.',
    output: 'Email draft ready for review.',
  },
  {
    id: 'supervisor',
    title: 'Supervisor Notification',
    completedStatus: 'Queued',
    statusColor: 'amber',
    icon: <SupervisorIcon />,
    description: () => 'Supervisor review notification prepared due to reserve increase and documentation update.',
    output: 'Review queue updated.',
  },
  {
    id: 'sla',
    title: 'SLA Monitoring',
    completedStatus: 'Monitoring',
    statusColor: 'amber',
    icon: <TimerIcon />,
    description: () => 'SLA countdown tracked against claim priority and pending adjuster actions.',
    output: 'Operational monitoring active.',
  },
];

/* ═══════════════════════════════════════════
   Main page
═══════════════════════════════════════════ */
export default function AutoAlertsPage({ claim, onBack, docPackage, onAlertAdded, onNavigateToDocumentation, initialAlertsRun, initialAlertsAdded, onAlertsRun }: Props) {
  const alreadyHasAlerts = !!docPackage?.alerts;

  const [completedCount, setCompletedCount] = useState(initialAlertsRun ? 5 : 0);
  const [isRunning,      setIsRunning]      = useState(false);
  const [allDone,        setAllDone]        = useState(initialAlertsRun);
  const [pkgAdded,       setPkgAdded]       = useState(initialAlertsAdded || alreadyHasAlerts);
  const [pkgSuccess,     setPkgSuccess]     = useState(initialAlertsAdded);

  const logRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll activity log */
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [completedCount]);

  const handleRunAlertSetup = () => {
    if (allDone || isRunning) return;
    setIsRunning(true);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        setCompletedCount(i + 1);
        if (i === 4) { setIsRunning(false); setAllDone(true); onAlertsRun(); }
      }, (i + 1) * 500);
    }
  };

  const handleAddToPackage = () => {
    if (!allDone || pkgAdded || alreadyHasAlerts) return;
    const pkg: AlertPackage = { confidence: 96, alertsCount: 5, communicationDrafted: true };
    setPkgAdded(true);
    setPkgSuccess(true);
    onAlertAdded(pkg);
  };

  const addDisabled = !allDone || pkgAdded || alreadyHasAlerts;
  const addLabel    = alreadyHasAlerts
    ? 'Coordination Actions Already in Package'
    : pkgAdded
    ? 'Added to Package ✓'
    : 'Add Coordination Actions to Documentation Package';

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#f1f5f9' }}>

      {/* ── Header ── */}
      <PageHeader claim={claim} onBack={onBack} allDone={allDone} isRunning={isRunning} />

      {/* ── Body ── */}
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ padding: '20px 32px 0', gap: 16 }}
      >

        {/* Main scroll area */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-5 pb-6">

          {/* Summary card */}
          <AlertSummaryCard claim={claim} allDone={allDone} isRunning={isRunning} completedCount={completedCount} />

          {/* Five alert cards */}
          <div className="grid grid-cols-3 gap-4">
            {ALERT_CARDS.map((card, idx) => (
              <AlertCard
                key={card.id}
                card={card}
                claim={claim}
                completed={idx < completedCount}
                processing={idx === completedCount && isRunning}
                execTime={EXEC_TIMES[idx]}
                timestamp={TIMESTAMPS[idx]}
              />
            ))}
          </div>

          {/* Orchestration timeline */}
          {(isRunning || allDone) && (
            <OrchestrationTimeline completedCount={completedCount} isRunning={isRunning} allDone={allDone} logRef={logRef} />
          )}

          {/* Package success banner */}
          {pkgSuccess && (
            <div
              className="rounded-2xl border border-emerald-200 overflow-hidden"
              style={{ background: '#f0fdf4', boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-4" style={{ padding: '18px 24px' }}>
                <div
                  className="rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    width: 38, height: 38,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 2px 8px rgba(5,150,105,0.30)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2.5 8l4 4L13.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-black text-emerald-800 leading-tight" style={{ fontSize: 14 }}>
                    Workflow coordination actions added to the documentation package.
                  </p>
                  <p className="font-medium text-emerald-600 mt-0.5" style={{ fontSize: 12 }}>
                    5 coordination actions prepared · 1 communication drafted · Operational monitoring active · Confidence 96%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right monitoring panel */}
        <div className="shrink-0 overflow-y-auto pb-6 space-y-4" style={{ width: 248 }}>
          <MonitoringPanel completedCount={completedCount} allDone={allDone} claim={claim} />
        </div>
      </div>

      {/* ── Action bar ── */}
      <div
        className="shrink-0 border-t border-slate-200"
        style={{ background: '#fff', padding: '14px 32px', boxShadow: '0 -2px 12px rgba(15,52,96,0.06)' }}
      >
        <div className="flex items-center gap-3">

          {/* Run Alert Setup */}
          <button
            onClick={handleRunAlertSetup}
            disabled={allDone || isRunning}
            className="flex items-center gap-2 font-bold rounded-xl transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed"
            style={{
              fontSize: 13, padding: '10px 22px', border: 'none',
              background: allDone || isRunning
                ? '#e2e8f0'
                : `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
              color: allDone || isRunning ? '#94a3b8' : '#fff',
              boxShadow: allDone || isRunning ? 'none' : '0 2px 10px rgba(25,118,210,0.28)',
            }}
          >
            {isRunning ? (
              <>
                <span
                  className="inline-block rounded-full border-2 border-white border-t-transparent shrink-0"
                  style={{ width: 12, height: 12, animation: 'spin 0.7s linear infinite' }}
                />
                Configuring…
              </>
            ) : allDone ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 6.5l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Coordination Complete
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M6.5 4.5V7l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M4.5 1.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Run Workflow Coordination
              </>
            )}
          </button>

          {/* Add to Documentation Package */}
          <button
            onClick={handleAddToPackage}
            disabled={addDisabled}
            className="flex items-center gap-2 font-bold rounded-xl transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed"
            style={{
              fontSize: 13, padding: '10px 22px', border: 'none',
              background: addDisabled
                ? '#e2e8f0'
                : `linear-gradient(135deg, ${NAVY} 0%, #1a4a7a 100%)`,
              color: addDisabled ? '#94a3b8' : '#fff',
              boxShadow: addDisabled ? 'none' : '0 2px 10px rgba(15,52,96,0.28)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M6.5 4v5M4 6.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {addLabel}
          </button>

          <div className="flex-1" />

          {pkgAdded ? (
            <button
              onClick={onNavigateToDocumentation}
              className="flex items-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97]"
              style={{ fontSize: 13, padding: '10px 22px', background: NAVY, color: '#fff', boxShadow: '0 2px 10px rgba(15,52,96,0.28)' }}
            >
              Review Documentation
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M5 2.5L9.5 6.5 5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={onBack}
              className="flex items-center gap-2 font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-[#1976d2] transition-all active:scale-[0.97]"
              style={{ fontSize: 13, padding: '10px 22px' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2.5L3.5 6.5 8 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Return to Journey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page header
═══════════════════════════════════════════ */
function PageHeader({ claim, onBack, allDone, isRunning }: {
  claim: Claim; onBack: () => void; allDone: boolean; isRunning: boolean;
}) {
  return (
    <div
      className="shrink-0 border-b border-slate-200"
      style={{ background: '#fff', padding: '0 32px', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}
    >
      <div style={{ paddingTop: 20, paddingBottom: 18 }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-[#1976d2] transition-colors mb-4 font-semibold"
          style={{ fontSize: 12 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Journey
        </button>

        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-black uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.18em', color: BLUE }}>
              AI Capability · Step 5 of 5 · Operational Follow-Up
            </p>
            <h1 className="font-black leading-tight" style={{ fontSize: 24, color: NAVY, letterSpacing: '-0.02em' }}>
              Workflow Coordination
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-semibold text-slate-500" style={{ fontSize: 13 }}>{claim.claimantName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-slate-500" style={{ fontSize: 12 }}>{claim.id}</span>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-500" style={{ fontSize: 13 }}>{claim.lossType}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Claim Scoped badge */}
            <div
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50"
              style={{ padding: '7px 14px' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1" y="1" width="9" height="9" rx="2" stroke="#64748b" strokeWidth="1.2"/>
                <path d="M3.5 5.5l1.5 1.5L7.5 4" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-black text-slate-500 uppercase" style={{ fontSize: 9, letterSpacing: '0.10em' }}>
                Claim Scoped
              </span>
            </div>

            {/* Monitoring status badge */}
            <div
              className="flex items-center gap-2 rounded-xl border transition-all"
              style={{
                padding: '7px 14px',
                background: allDone ? '#f0fdf4' : '#fffbeb',
                borderColor: allDone ? '#bbf7d0' : '#fde68a',
              }}
            >
              <span
                className="rounded-full shrink-0"
                style={{
                  width: 7, height: 7,
                  background: allDone ? '#059669' : '#d97706',
                  boxShadow: allDone
                    ? '0 0 6px rgba(5,150,105,0.5)'
                    : '0 0 6px rgba(217,119,6,0.5)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span
                className="font-black uppercase"
                style={{
                  fontSize: 9, letterSpacing: '0.10em',
                  color: allDone ? '#059669' : '#b45309',
                }}
              >
                {allDone ? 'Coordination Active' : isRunning ? 'Configuring…' : 'Monitoring'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Alert Summary Card
═══════════════════════════════════════════ */
function AlertSummaryCard({ claim, allDone, isRunning, completedCount }: {
  claim: Claim; allDone: boolean; isRunning: boolean; completedCount: number;
}) {
  const confidenceWidth = allDone ? 96 : isRunning ? Math.min(completedCount * 18, 80) : 0;

  const kpis = [
    { label: 'Claim File',  value: 'Create a Notice and a Future Alert', wide: true },
    { label: 'Type',        value: 'Update Claim File Noting the Status', wide: true },
    { label: 'Result',      value: allDone ? 'Workflow actions configured' : isRunning ? 'Configuring…' : '—', wide: false },
    { label: 'Status',      value: allDone ? 'Monitoring' : isRunning ? 'Configuring' : 'Pending', wide: false },
    { label: 'Confidence',  value: allDone ? '96%' : isRunning ? `${completedCount * 18}%` : '—', wide: false },
  ];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b border-slate-100"
        style={{ padding: '14px 24px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{
            width: 30, height: 30,
            background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
            boxShadow: '0 2px 6px rgba(25,118,210,0.28)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5C7 1.5 11.5 3.5 11.5 8L7 11 2.5 8C2.5 3.5 7 1.5 7 1.5z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M5 9L3.5 12M9 9L10.5 12" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 13 }}>
            QARL Workflow Coordination Summary
          </p>
          <p className="text-slate-400 font-medium leading-none mt-0.5" style={{ fontSize: 11 }}>
            {claim.claimantName} · {claim.id} · Operational Follow-Up
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {allDone && (
            <div
              className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50"
              style={{ padding: '3px 12px' }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2 2L7.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-black text-emerald-700 uppercase" style={{ fontSize: 8, letterSpacing: '0.10em' }}>
                Workflow actions configured
              </span>
            </div>
          )}
          {isRunning && (
            <span className="font-bold text-blue-600 animate-pulse" style={{ fontSize: 11 }}>
              Configuring alerts…
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="flex items-stretch divide-x divide-slate-100">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="flex flex-col justify-center"
            style={{ padding: '16px 20px', flex: kpi.wide ? 2 : 1 }}
          >
            <p className="font-black text-slate-400 uppercase mb-1" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
              {kpi.label}
            </p>
            <p
              className="font-black text-[#0f3460] leading-tight"
              style={{ fontSize: kpi.wide ? 12 : 14 }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div style={{ padding: '0 24px 14px' }}>
        <div className="rounded-full bg-slate-100 overflow-hidden" style={{ height: 4 }}>
          <div
            className="rounded-full h-full"
            style={{
              width: `${confidenceWidth}%`,
              background: `linear-gradient(to right, ${BLUE}, ${NAVY})`,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Alert Card
═══════════════════════════════════════════ */
function AlertCard({ card, claim, completed, processing, execTime: _execTime, timestamp }: {
  card: AlertCardDef;
  claim: Claim;
  completed: boolean;
  processing: boolean;
  execTime: string;
  timestamp: string;
}) {
  const isPending = !completed && !processing;

  const COLOR = {
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '#059669' },
    blue:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: BLUE },
    amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: '#d97706' },
  }[card.statusColor];

  return (
    <div
      className="flex flex-col rounded-2xl bg-white overflow-hidden"
      style={{
        border: `1.5px solid ${completed ? COLOR.border : processing ? '#bfdbfe' : '#e2e8f0'}`,
        boxShadow: processing
          ? `${CARD_SHADOW}, 0 0 0 3px rgba(25,118,210,0.10)`
          : CARD_SHADOW,
        opacity: isPending ? 0.55 : 1,
        minHeight: 196,
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease',
      }}
    >
      {/* Header: icon + status */}
      <div className="flex items-center justify-between shrink-0" style={{ padding: '12px 14px 8px' }}>
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{
            width: 28, height: 28,
            background: completed ? COLOR.bg : processing ? '#eff6ff' : '#f1f5f9',
            border: `1px solid ${completed ? COLOR.border : processing ? '#bfdbfe' : '#e2e8f0'}`,
            color: completed ? COLOR.icon : processing ? BLUE : '#94a3b8',
            transition: 'background 0.4s, border-color 0.4s, color 0.4s',
          }}
        >
          {card.icon}
        </div>

        {/* Status badge */}
        <span
          className="font-bold rounded-full border flex items-center gap-1.5"
          style={{
            fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px',
            background: completed ? COLOR.bg : processing ? '#eff6ff' : '#f8fafc',
            borderColor: completed ? COLOR.border : processing ? '#bfdbfe' : '#e2e8f0',
            color: completed ? COLOR.text : processing ? '#1d4ed8' : '#94a3b8',
            transition: 'background 0.4s, color 0.4s, border-color 0.4s',
          }}
        >
          {processing && (
            <span
              className="inline-block rounded-full bg-blue-500 shrink-0 animate-pulse"
              style={{ width: 5, height: 5 }}
            />
          )}
          {completed ? card.completedStatus : processing ? 'Processing' : 'Pending'}
        </span>
      </div>

      {/* Title + description */}
      <div style={{ padding: '0 14px 8px' }}>
        <p
          className="font-black leading-tight"
          style={{
            fontSize: 12,
            color: completed ? NAVY : processing ? NAVY : '#64748b',
            transition: 'color 0.4s',
          }}
        >
          {card.title}
        </p>
        <p className="font-medium text-slate-500 mt-1 leading-snug" style={{ fontSize: 10 }}>
          {card.description(claim)}
        </p>
      </div>

      {/* Output — slides in when completed */}
      <div
        style={{
          padding: '0 14px',
          maxHeight: completed ? 64 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          className="rounded-lg border"
          style={{
            padding: '7px 10px', marginBottom: 8,
            background: COLOR.bg, borderColor: COLOR.border,
          }}
        >
          <p className="font-black uppercase mb-0.5" style={{ fontSize: 7, letterSpacing: '0.12em', color: COLOR.text }}>
            Output
          </p>
          <p className="font-semibold leading-snug" style={{ fontSize: 10, color: NAVY }}>
            {card.output}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-auto border-t border-slate-100 flex items-center justify-between"
        style={{ padding: '8px 14px', background: 'rgba(248,250,252,0.8)' }}
      >
        {completed ? (
          <span className="font-mono text-slate-400" style={{ fontSize: 9 }}>{timestamp}</span>
        ) : processing ? (
          <span className="font-bold text-blue-600 animate-pulse" style={{ fontSize: 9 }}>Configuring…</span>
        ) : (
          <span className="font-bold text-slate-400" style={{ fontSize: 9 }}>Pending configuration</span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Orchestration Timeline
═══════════════════════════════════════════ */
function OrchestrationTimeline({ completedCount, isRunning, allDone, logRef }: {
  completedCount: number; isRunning: boolean; allDone: boolean;
  logRef: { current: HTMLDivElement | null };
}) {
  const visibleEntries = ACTIVITY_LOG.slice(0, isRunning ? completedCount : allDone ? ACTIVITY_LOG.length : completedCount + 1);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div
        className="flex items-center justify-between border-b border-slate-100"
        style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{ width: 24, height: 24, background: NAVY }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.1"/>
              <path d="M3 4h5M3 6.5h3" stroke="white" strokeWidth="0.9" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>
            QARL Orchestration Timeline
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50"
          style={{ padding: '2px 10px' }}
        >
          <span className="rounded-full bg-blue-500 shrink-0 animate-pulse" style={{ width: 5, height: 5 }} />
          <span className="font-black text-blue-700 uppercase" style={{ fontSize: 7, letterSpacing: '0.10em' }}>Live</span>
        </div>
      </div>

      <div ref={logRef} style={{ padding: '12px 20px', maxHeight: 180, overflowY: 'auto' }}>
        <div className="space-y-2">
          {visibleEntries.map((entry, i) => {
            const isNewest = isRunning && i === visibleEntries.length - 1;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg"
                style={{
                  padding: '5px 8px',
                  background: isNewest ? 'rgba(25,118,210,0.06)' : 'transparent',
                  transition: 'background 0.6s ease',
                }}
              >
                <span className="font-mono text-slate-400 shrink-0" style={{ fontSize: 9 }}>{entry.time}</span>
                <div
                  className="rounded-full shrink-0"
                  style={{ width: 6, height: 6, background: isNewest ? BLUE : '#059669' }}
                />
                <span className="font-medium text-slate-700" style={{ fontSize: 11 }}>{entry.text}</span>
                {!isNewest && (
                  <span className="ml-auto font-bold text-emerald-600 shrink-0" style={{ fontSize: 9 }}>✓</span>
                )}
                {isNewest && (
                  <span className="ml-auto font-bold text-blue-600 shrink-0 animate-pulse" style={{ fontSize: 9 }}>NOW</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Right Monitoring Panel
═══════════════════════════════════════════ */
function MonitoringPanel({ completedCount, allDone, claim: _claim }: {
  completedCount: number; allDone: boolean; claim: Claim;
}) {
  const statusItems = [
    { text: 'Claim notice prepared',             done: completedCount >= 1 },
    { text: 'Follow-up reminder scheduled',        done: completedCount >= 2 },
    { text: 'Agent email drafted',                done: completedCount >= 3 },
    { text: 'Supervisor notification queued',     done: completedCount >= 4 },
    { text: 'Operational monitoring active',       done: completedCount >= 5 },
    { text: 'Documentation package updated',      done: allDone },
  ];

  return (
    <>
      {/* Alert status */}
      <div
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div
          className="border-b border-slate-100"
          style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}
        >
          <p className="font-black text-[#0f3460]" style={{ fontSize: 11 }}>Alert Status</p>
          <p className="font-medium text-slate-400 mt-0.5" style={{ fontSize: 10 }}>
            Workflow coordination
          </p>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div className="space-y-2.5">
            {statusItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{
                    width: 16, height: 16,
                    background: item.done ? '#d1fae5' : '#f1f5f9',
                    transition: 'background 0.4s',
                  }}
                >
                  {item.done ? (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="rounded-full bg-slate-300 shrink-0" style={{ width: 4, height: 4 }} />
                  )}
                </div>
                <span
                  className="font-medium leading-tight"
                  style={{
                    fontSize: 10,
                    color: item.done ? '#0f3460' : '#94a3b8',
                    transition: 'color 0.4s',
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  );
}

/* ═══════════════════════════════════════════
   Icon components
═══════════════════════════════════════════ */
function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="2" y="1" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5h5M4 7h5M4 9h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1.5" y="2.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 5.5h10M4.5 1v3M8.5 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function MailDraftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1.5" y="3" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 5l5 3.5 5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function SupervisorIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 11c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="10.5" cy="2.5" r="1" fill="currentColor"/>
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6.5 4.5v3L8.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4.5 1.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
