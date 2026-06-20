import { useState, useEffect } from 'react';
import type { Claim } from '../types';
import type { WorkflowRunResult } from '../services/qarlApi';

/* ── Capability flags (subset of App.tsx CapabilityState — structurally compatible) ── */
interface CapabilityFlags {
  multiPartyAdded: boolean;
  documentationVisited: boolean;
  enrichmentAdded: boolean;
  alertsAdded: boolean;
}

interface Props {
  claim: Claim;
  onBack: () => void;
  /* Navigation props kept for App.tsx interface compatibility. Not surfaced as CTA
     buttons in this design — capabilities are runtime steps, not launch points. */
  onViewDocumentation: () => void;
  onViewMultiParty: () => void;
  onViewEnrichments: () => void;
  onViewAlerts: () => void;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
  capFlags: CapabilityFlags;
  workflowRun?: WorkflowRunResult | null;
  backendStatus?: 'loading' | 'connected' | 'prototype' | null;
}

/* ── Design tokens ── */
const BLUE        = '#1976d2';
const NAVY        = '#0f3460';
const CARD_SHADOW = '0 1px 4px rgba(15,52,96,0.06), 0 6px 20px rgba(15,52,96,0.07)';

/* ── Animation timing ── */
const STEP_DELAY    = 1600;
const INITIAL_DELAY = 500;
const FINAL_ELAPSED = INITIAL_DELAY + 5 * STEP_DELAY;

/* ── Stage label map ── */
const STAGE_NAMES = [
  'Initializing…',
  'Context Clarification',
  'Multi-Party Coordination',
  'Documentation Assembly',
  'AI Enrichment',
  'Proactive Alerts',
  'AI Package Ready',
];

/* ── Pipeline stage labels ── */
const PIPELINE_STAGES = [
  'Context\nClarification',
  'Multi-Party\nCoordination',
  'Documentation\nAssembly',
  'AI\nEnrichment',
  'Proactive\nAlerts',
];

/* ── Manual items eliminated by QARL ── */
const MANUAL_ITEMS = [
  'Login PolicyCenter',
  'Read policy manually',
  'Search EDW',
  'Open Outlook',
  'Copy / paste notes',
  'Manual routing',
  'Write email manually',
  'Manual documentation',
];

/* ── Autonomous tasks completed by QARL runtime ── */
const AUTO_ITEMS: { text: string; minStep: number }[] = [
  { text: 'Coverage verified',          minStep: 1 },
  { text: 'Policy validated',           minStep: 1 },
  { text: 'Claim context loaded',       minStep: 1 },
  { text: 'Documentation assembled',    minStep: 3 },
  { text: 'Notifications prepared',     minStep: 5 },
  { text: 'Runtime evidence generated', minStep: 5 },
  { text: 'AI package prepared',        minStep: 6 },
  { text: 'Awaiting human approval',    minStep: 6 },
];

/* ── Enterprise adapter contracts ── */
const ADAPTER_ROWS: {
  system: string;
  direction: string;
  dirType: 'read' | 'write' | 'draft' | 'publish';
  purpose: string;
}[] = [
  { system: 'PolicyCenter', direction: 'READ',               dirType: 'read',    purpose: 'Coverage and policy verification'           },
  { system: 'ClaimCenter',  direction: 'READ / WRITE PENDING', dirType: 'write', purpose: 'Claim context and governed note write-back' },
  { system: 'EDW',          direction: 'READ',               dirType: 'read',    purpose: 'Comparable loss and fraud enrichment'        },
  { system: 'Outlook',      direction: 'DRAFT',              dirType: 'draft',   purpose: 'Assignment email and adjuster notifications' },
  { system: 'Event Bus',    direction: 'PUBLISH',            dirType: 'publish', purpose: 'Governance audit event publication'          },
];

const TRACE_EVENTS: { system: string; event: string; warn?: boolean }[] = [
  { system: 'PolicyCenter', event: 'Policy coverage read'                         },
  { system: 'ClaimCenter',  event: 'Claim context read'                           },
  { system: 'EDW',          event: 'Comparable loss data read'                    },
  { system: 'Outlook',      event: 'Email draft prepared'                         },
  { system: 'ClaimCenter',  event: 'Write-back blocked pending approval', warn: true },
  { system: 'Event Bus',    event: 'Audit event published'                        },
];

const DIR_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  read:    { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  write:   { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  draft:   { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
  publish: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

/* ════════════════════════════════════════════════
   Main page export
════════════════════════════════════════════════ */
export default function PostFnolCoverageJourneyPage({
  claim,
  onBack,
  onViewDocumentation: _onViewDocumentation,
  onViewMultiParty: _onViewMultiParty,
  onViewEnrichments: _onViewEnrichments,
  onViewAlerts: _onViewAlerts,
  hasAnimated,
  onAnimationComplete,
  capFlags,
  workflowRun,
  backendStatus,
}: Props) {
  const [activeStep, setActiveStep] = useState(hasAnimated ? 6 : 0);
  const [elapsed, setElapsed]       = useState(hasAnimated ? FINAL_ELAPSED : 0);

  /* Sequential step advancement — only runs on first visit */
  useEffect(() => {
    if (hasAnimated) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(
        setTimeout(() => {
          setActiveStep(i);
          if (i === 6) onAnimationComplete();
        }, INITIAL_DELAY + (i - 1) * STEP_DELAY)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Elapsed time counter (stops at completion) */
  useEffect(() => {
    if (activeStep >= 6) return;
    const t = setInterval(() => setElapsed(s => s + 100), 100);
    return () => clearInterval(t);
  }, [activeStep]);

  const completedCount = Math.max(0, activeStep - 1);
  const isComplete     = activeStep >= 6;
  const elapsedSec     = (elapsed / 1000).toFixed(1);
  const backendReady   = isComplete && !!workflowRun;

  const execTime = backendReady && workflowRun!.executionTimeMs >= 1000
    ? `${(workflowRun!.executionTimeMs / 1000).toFixed(1)}s`
    : `${elapsedSec}s${isComplete ? '' : '…'}`;

  const confidence = backendReady
    ? `${workflowRun!.coverageConfidence}%`
    : completedCount >= 1 ? '98%' : '—';

  const currentStage  = STAGE_NAMES[Math.min(activeStep, 6)];
  const approvalDone  = capFlags.documentationVisited;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: '#f1f5f9' }}>

      {/* ══ Section 1: QARL Runtime Execution Header ══ */}
      <RuntimeHeader
        claim={claim}
        onBack={onBack}
        isComplete={isComplete}
        completedCount={completedCount}
        currentStage={currentStage}
        confidence={confidence}
        execTime={execTime}
        approvalDone={approvalDone}
        backendStatus={backendStatus}
        workflowRun={workflowRun ?? null}
      />

      {/* ══ Section 2: Manual vs Autonomous ══ */}
      <ManualVsAutonomous activeStep={activeStep} />

      {/* ══ Section 3: QARL Execution Pipeline ══ */}
      <ExecutionPipeline
        completedCount={completedCount}
        isComplete={isComplete}
        activeStep={activeStep}
      />

      {/* ══ Section 4: AI Package + Governed Execution ══ */}
      <AiPackageSection
        isComplete={isComplete}
        capFlags={capFlags}
        workflowRun={workflowRun ?? null}
        backendStatus={backendStatus ?? null}
        approvalDone={approvalDone}
      />

      {/* ══ Section 5: Enterprise Adapter Layer ══ */}
      <div style={{ padding: '20px 40px 0' }}>
        <EnterpriseAdapterLayerPanel
          backendStatus={backendStatus ?? null}
          workflowRun={workflowRun ?? null}
        />
      </div>

      {/* ══ Completion banner (animated reveal) ══ */}
      <div
        style={{
          padding: '24px 40px 40px',
          overflow: 'hidden',
          maxHeight: isComplete ? 200 : 0,
          opacity: isComplete ? 1 : 0,
          transition: 'max-height 0.6s ease, opacity 0.5s ease',
        }}
      >
        <CompletionBanner onBack={onBack} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Section 1 — QARL Runtime Execution Header
════════════════════════════════════════════════ */
function RuntimeHeader({
  claim,
  onBack,
  isComplete,
  completedCount,
  currentStage,
  confidence,
  execTime,
  approvalDone,
  backendStatus,
  workflowRun,
}: {
  claim: Claim;
  onBack: () => void;
  isComplete: boolean;
  completedCount: number;
  currentStage: string;
  confidence: string;
  execTime: string;
  approvalDone: boolean;
  backendStatus?: 'loading' | 'connected' | 'prototype' | null;
  workflowRun: WorkflowRunResult | null;
}) {
  const runtimeStatus = !isComplete ? 'Running…' : 'Completed';
  const executionId   = workflowRun ? `${workflowRun.runId.slice(0, 8)}…` : 'Prototype';
  const approvalLabel = !isComplete ? 'Not ready' : approvalDone ? 'Approved' : 'Pending Human Review';

  const stats: { label: string; value: string; mono?: boolean; color?: string }[] = [
    { label: 'Execution Mode',      value: 'Autonomous (Supervised)'                    },
    { label: 'Runtime Status',      value: runtimeStatus, color: isComplete ? '#4ade80' : '#93c5fd' },
    { label: 'Workflow Progress',   value: `${Math.min(completedCount, 5)} of 5 capabilities`, mono: true },
    { label: 'Current Stage',       value: currentStage                                 },
    { label: 'Coverage Confidence', value: confidence, mono: true                       },
    { label: 'Execution Time',      value: execTime, mono: true                         },
    { label: 'Human Approval',      value: approvalLabel,
      color: !isComplete ? '#64748b' : approvalDone ? '#4ade80' : '#fbbf24'             },
    { label: 'Execution ID',        value: executionId, mono: true                      },
  ];

  return (
    <div className="shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
      {/* Top row: back + claim identity + status badges */}
      <div style={{ padding: '20px 40px 16px' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-[#1976d2] transition-colors mb-5 font-semibold"
          style={{ fontSize: 12 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Workspace
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.18em', color: BLUE }}>
              QARL Agentic Runtime
            </p>
            <h1 className="font-black leading-tight" style={{ fontSize: 24, color: NAVY, letterSpacing: '-0.02em' }}>
              Autonomous Claims Workflow
            </h1>
            <p className="font-medium text-slate-500 mt-1" style={{ fontSize: 13 }}>
              {claim.claimantName}
              {' · '}
              <span className="font-mono text-slate-400" style={{ fontSize: 12 }}>{claim.id}</span>
              {' · '}
              {claim.lossType}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50"
              style={{ padding: '8px 16px' }}
            >
              <span
                className="rounded-full bg-emerald-400 shrink-0"
                style={{ width: 7, height: 7, boxShadow: '0 0 6px rgba(52,211,153,0.6)', animation: 'pulse 2s infinite' }}
              />
              <span className="font-black text-blue-700 uppercase" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                QARL Active
              </span>
            </div>

            {backendStatus === 'connected' && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50" style={{ padding: '4px 10px' }}>
                <span className="rounded-full bg-emerald-400 shrink-0" style={{ width: 5, height: 5 }} />
                <span className="font-semibold text-emerald-700 uppercase" style={{ fontSize: 8, letterSpacing: '0.10em' }}>
                  LangGraph Supervisor: Connected
                </span>
              </div>
            )}
            {backendStatus === 'loading' && (
              <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50" style={{ padding: '4px 10px' }}>
                <span className="rounded-full bg-blue-300 shrink-0 animate-pulse" style={{ width: 5, height: 5 }} />
                <span className="font-semibold text-blue-500 uppercase" style={{ fontSize: 8, letterSpacing: '0.10em' }}>
                  LangGraph Supervisor: Connecting…
                </span>
              </div>
            )}
            {backendStatus === 'prototype' && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50" style={{ padding: '4px 10px' }}>
                <span className="rounded-full bg-slate-300 shrink-0" style={{ width: 5, height: 5 }} />
                <span className="font-semibold text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.10em' }}>
                  Prototype Mode
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution stats grid — 4 × 2 on dark navy */}
      <div
        className="grid border-t border-slate-100"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', background: NAVY }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col justify-center px-6 py-3 border-r border-b"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <p className="font-bold text-blue-300 uppercase leading-none mb-1" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
              {stat.label}
            </p>
            <p
              className={`font-black leading-snug${stat.mono ? ' font-mono' : ''}`}
              style={{ fontSize: i === 3 ? 11 : 12, color: stat.color ?? 'white' }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Section 2 — Manual vs Autonomous
════════════════════════════════════════════════ */
function ManualVsAutonomous({ activeStep }: { activeStep: number }) {
  return (
    <div style={{ padding: '20px 40px 0' }}>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
        {/* Card header */}
        <div
          className="flex items-center justify-between border-b border-slate-100"
          style={{ padding: '11px 24px', background: 'rgba(248,250,252,0.9)' }}
        >
          <p className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>Workflow Transformation</p>
          <p className="font-medium text-slate-400" style={{ fontSize: 10 }}>
            What QARL eliminates · What QARL executes
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100">
          {/* LEFT — Traditional Process (eliminated) */}
          <div style={{ padding: '16px 24px 20px' }}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="rounded-full border border-rose-300 bg-rose-100"
                style={{ width: 8, height: 8, flexShrink: 0 }}
              />
              <p className="font-black uppercase text-rose-600" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
                Current Friction — Traditional Process
              </p>
            </div>
            <div className="space-y-2.5">
              {MANUAL_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0"
                    style={{ width: 16, height: 16 }}
                  >
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 1.5l4 4M5.5 1.5l-4 4" stroke="#f43f5e" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span
                    className="font-medium"
                    style={{ fontSize: 11, color: '#64748b', textDecoration: 'line-through', textDecorationColor: '#fca5a5' }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — QARL Autonomous Execution */}
          <div style={{ padding: '16px 24px 20px' }}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="rounded-full bg-emerald-400"
                style={{ width: 8, height: 8, flexShrink: 0, boxShadow: '0 0 6px rgba(52,211,153,0.5)' }}
              />
              <p className="font-black uppercase text-emerald-700" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
                Autonomous Runtime — QARL Execution
              </p>
            </div>
            <div className="space-y-2.5">
              {AUTO_ITEMS.map((item, i) => {
                const done = activeStep >= item.minStep;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{
                        width: 16, height: 16,
                        background: done ? '#d1fae5' : '#f1f5f9',
                        border: `1px solid ${done ? '#6ee7b7' : '#e2e8f0'}`,
                        transition: 'background 0.5s ease, border-color 0.5s ease',
                      }}
                    >
                      {done ? (
                        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                          <path d="M1 3.5l1.5 1.5L6 1.5" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="rounded-full bg-slate-300" style={{ width: 3, height: 3 }} />
                      )}
                    </div>
                    <span
                      className="font-medium"
                      style={{ fontSize: 11, color: done ? '#059669' : '#94a3b8', transition: 'color 0.5s ease' }}
                    >
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Section 3 — QARL Execution Pipeline
════════════════════════════════════════════════ */
function ExecutionPipeline({
  completedCount,
  isComplete,
  activeStep,
}: {
  completedCount: number;
  isComplete: boolean;
  activeStep: number;
}) {
  const pipelineNodes: React.ReactNode[] = [
    <PipelineNode key="start" label={'QARL\nRuntime'} status="completed" isStart />,
    ...PIPELINE_STAGES.flatMap((label, idx) => {
      const status: 'completed' | 'processing' | 'pending' =
        idx < completedCount     ? 'completed'
        : (idx === completedCount && !isComplete) ? 'processing'
        : 'pending';
      return [
        <PipelineConnector key={`c${idx}`} active={activeStep > idx} />,
        <PipelineNode       key={`s${idx}`} label={label} status={status} />,
      ];
    }),
    <PipelineConnector key="cfinal" active={isComplete} />,
    <PipelineNode      key="end" label={'AI Package\nReady'} status={isComplete ? 'completed' : 'pending'} isEnd />,
  ];

  return (
    <div style={{ padding: '20px 40px 0' }}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: NAVY, boxShadow: '0 4px 16px rgba(15,52,96,0.22)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-4 pb-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl flex items-center justify-center shrink-0"
              style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, #1976d2 0%, #3b82f6 100%)',
                boxShadow: '0 2px 8px rgba(25,118,210,0.40)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4.5" r="2.2" stroke="white" strokeWidth="1.3"/>
                <path d="M2 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-white leading-none" style={{ fontSize: 12 }}>
                QARL Execution Pipeline
              </p>
              <p className="font-bold text-blue-300 uppercase leading-none mt-0.5" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
                One runtime · Five capabilities · Autonomous orchestration
              </p>
            </div>
          </div>
          <span
            className="font-bold rounded-full border"
            style={{
              fontSize: 9, letterSpacing: '0.08em', padding: '3px 12px',
              color: isComplete ? '#4ade80' : '#93c5fd',
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            {isComplete ? '✓ All Capabilities Complete' : `${Math.min(completedCount, 5)} / 5 Executing`}
          </span>
        </div>

        {/* Pipeline */}
        <div className="flex items-start px-6 py-6">
          {pipelineNodes}
        </div>
      </div>
    </div>
  );
}

function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center flex-1 mt-5" style={{ minWidth: 16 }}>
      <div
        className="flex-1 h-px"
        style={{ background: active ? '#3b82f6' : 'rgba(255,255,255,0.10)', transition: 'background 0.5s ease' }}
      />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M0 4h6M3.5 1.5l2.5 2.5L3.5 6.5"
          stroke={active ? '#3b82f6' : 'rgba(255,255,255,0.12)'}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function PipelineNode({
  label,
  status,
  isStart,
  isEnd,
}: {
  label: string;
  status: 'completed' | 'processing' | 'pending';
  isStart?: boolean;
  isEnd?: boolean;
}) {
  const isCompleted  = status === 'completed';
  const isProcessing = status === 'processing';

  let ringColor: string;
  let bgColor: string;
  let textColor: string;

  if (isStart) {
    ringColor = '#3b82f6'; bgColor = 'rgba(59,130,246,0.18)'; textColor = '#93c5fd';
  } else if (isEnd && isCompleted) {
    ringColor = '#4ade80'; bgColor = 'rgba(74,222,128,0.14)'; textColor = '#4ade80';
  } else if (isCompleted) {
    ringColor = '#4ade80'; bgColor = 'rgba(74,222,128,0.08)'; textColor = 'rgba(255,255,255,0.90)';
  } else if (isProcessing) {
    ringColor = '#3b82f6'; bgColor = 'rgba(59,130,246,0.14)'; textColor = '#93c5fd';
  } else {
    ringColor = 'rgba(255,255,255,0.12)'; bgColor = 'rgba(255,255,255,0.03)'; textColor = 'rgba(255,255,255,0.30)';
  }

  const statusLabel = isStart
    ? 'Runtime'
    : isCompleted  ? 'Done'
    : isProcessing ? 'Running'
    : 'Pending';

  return (
    <div className="flex flex-col items-center shrink-0" style={{ width: isStart || isEnd ? 86 : 76 }}>
      <div
        className="rounded-full flex items-center justify-center mb-2"
        style={{
          width: 40, height: 40,
          background: bgColor,
          border: `1.5px solid ${ringColor}`,
          boxShadow: isProcessing ? '0 0 14px rgba(59,130,246,0.40)' : 'none',
          animation: isProcessing ? 'pulse 2s infinite' : 'none',
          transition: 'background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease',
        }}
      >
        {isStart ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="5" r="2.5" stroke="#93c5fd" strokeWidth="1.3"/>
            <path d="M2.5 13c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="#93c5fd" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ) : isCompleted ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l2.5 2.5L11 4" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : isProcessing ? (
          <div className="rounded-full animate-pulse" style={{ width: 8, height: 8, background: '#3b82f6' }} />
        ) : (
          <div className="rounded-full" style={{ width: 6, height: 6, background: 'rgba(255,255,255,0.15)' }} />
        )}
      </div>

      <p
        className="text-center leading-tight font-semibold"
        style={{ fontSize: 9, color: textColor, whiteSpace: 'pre-line', transition: 'color 0.5s ease' }}
      >
        {label}
      </p>

      <p
        className="font-bold uppercase mt-1"
        style={{
          fontSize: 7.5, letterSpacing: '0.08em',
          color: isCompleted ? '#4ade80' : isProcessing ? '#93c5fd' : 'rgba(255,255,255,0.22)',
          transition: 'color 0.5s ease',
        }}
      >
        {statusLabel}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Section 4 — AI Package + Governed Execution
════════════════════════════════════════════════ */
function AiPackageSection({
  isComplete,
  capFlags,
  workflowRun,
  backendStatus,
  approvalDone,
}: {
  isComplete: boolean;
  capFlags: CapabilityFlags;
  workflowRun: WorkflowRunResult | null;
  backendStatus: 'loading' | 'connected' | 'prototype' | null;
  approvalDone: boolean;
}) {
  const isConnected  = backendStatus === 'connected';
  const isConnecting = backendStatus === 'loading';

  const packageItems: { label: string; done: boolean; detail?: string; pending?: boolean }[] = [
    { label: 'Coverage Verification',  done: isComplete                },
    { label: 'Documentation Package',  done: isComplete                },
    { label: 'Enrichment Results',     done: capFlags.enrichmentAdded  },
    { label: 'Alert Recommendations',  done: capFlags.alertsAdded      },
    { label: 'Conversation History',   done: isComplete                },
    { label: 'Governance Evidence',    done: !!workflowRun, detail: workflowRun ? `${workflowRun.auditTraceCount} events` : undefined },
    { label: 'Approval Status',        done: approvalDone, pending: isComplete && !approvalDone },
    { label: 'Execution Trace',        done: !!workflowRun, detail: workflowRun ? `${workflowRun.adapterEventCount} adapter events` : undefined },
  ];

  const runtimeRows: { label: string; value: string; mono?: boolean; valueColor: string; valueBg: string; valueBorder: string }[] = [
    {
      label: 'Runtime Orchestrator',
      value: isConnected ? 'LangGraph Supervisor' : isConnecting ? 'Connecting…' : 'Prototype Runtime',
      valueColor: isConnected ? '#059669' : isConnecting ? BLUE : '#92400e',
      valueBg:    isConnected ? '#f0fdf4' : isConnecting ? '#eff6ff' : '#fffbeb',
      valueBorder: isConnected ? '#bbf7d0' : isConnecting ? '#bfdbfe' : '#fde68a',
    },
    {
      label: 'Execution Status',
      value: isConnected ? 'Completed' : isConnecting ? 'Running…' : 'Prototype Mode',
      valueColor: isConnected ? '#059669' : isConnecting ? BLUE : '#92400e',
      valueBg:    isConnected ? '#f0fdf4' : isConnecting ? '#eff6ff' : '#fffbeb',
      valueBorder: isConnected ? '#bbf7d0' : isConnecting ? '#bfdbfe' : '#fde68a',
    },
    {
      label: 'Business Capabilities',
      value: workflowRun ? `${workflowRun.capabilitiesExecuted} executed` : 'Prototype',
      mono: !!workflowRun,
      valueColor: workflowRun ? NAVY : '#92400e',
      valueBg:    workflowRun ? '#eff6ff' : '#fffbeb',
      valueBorder: workflowRun ? '#bfdbfe' : '#fde68a',
    },
    {
      label: 'Governance Events',
      value: workflowRun ? `${workflowRun.auditTraceCount} recorded` : 'Prototype',
      mono: !!workflowRun,
      valueColor: workflowRun ? NAVY : '#92400e',
      valueBg:    workflowRun ? '#eff6ff' : '#fffbeb',
      valueBorder: workflowRun ? '#bfdbfe' : '#fde68a',
    },
    {
      label: 'Enterprise Connectors',
      value: isConnected ? 'Mock MCP Active' : 'Prototype',
      valueColor: isConnected ? '#059669' : '#92400e',
      valueBg:    isConnected ? '#f0fdf4' : '#fffbeb',
      valueBorder: isConnected ? '#bbf7d0' : '#fde68a',
    },
    {
      label: 'Execution ID',
      value: workflowRun ? `${workflowRun.runId.slice(0, 8)}…` : 'Not available',
      mono: true,
      valueColor: workflowRun ? '#475569' : '#94a3b8',
      valueBg:    workflowRun ? '#f8fafc' : 'transparent',
      valueBorder: workflowRun ? '#e2e8f0' : 'transparent',
    },
  ];

  return (
    <div style={{ padding: '20px 40px 0' }}>
      <div className="grid grid-cols-2 gap-5">

        {/* ── LEFT: Governed AI Package ── */}
        <div
          className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div
            className="flex items-center gap-2.5 border-b border-slate-100 shrink-0"
            style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
          >
            <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 26, height: 26, background: BLUE }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="1" width="9" height="10" rx="1.5" stroke="white" strokeWidth="1.1"/>
                <path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>Governed AI Package</p>
              <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
                Complete runtime deliverable — ready for adjuster review
              </p>
            </div>
          </div>

          <div className="flex-1" style={{ padding: '14px 20px' }}>
            {!isComplete ? (
              <p className="text-slate-400 font-medium animate-pulse" style={{ fontSize: 11 }}>
                Assembling AI package…
              </p>
            ) : (
              <div className="space-y-2">
                {packageItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 15, height: 15,
                          background: item.done ? '#d1fae5' : item.pending ? '#fef3c7' : '#f1f5f9',
                          border: `1px solid ${item.done ? '#6ee7b7' : item.pending ? '#fde68a' : '#e2e8f0'}`,
                        }}
                      >
                        {item.done ? (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : item.pending ? (
                          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                            <path d="M3.5 2v2.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round"/>
                            <circle cx="3.5" cy="5.5" r="0.5" fill="#b45309"/>
                          </svg>
                        ) : (
                          <div className="rounded-full bg-slate-300" style={{ width: 4, height: 4 }} />
                        )}
                      </div>
                      <span className="font-medium" style={{ fontSize: 11, color: item.done ? '#374151' : item.pending ? '#92400e' : '#94a3b8' }}>
                        {item.label}
                      </span>
                    </div>
                    <span
                      className="font-bold rounded border shrink-0"
                      style={{
                        fontSize: 8, letterSpacing: '0.04em', padding: '1px 6px',
                        color:       item.done ? '#059669' : item.pending ? '#b45309' : '#94a3b8',
                        background:  item.done ? '#f0fdf4' : item.pending ? '#fffbeb' : '#f8fafc',
                        borderColor: item.done ? '#bbf7d0' : item.pending ? '#fde68a' : '#e2e8f0',
                      }}
                    >
                      {item.done ? (item.detail ?? 'Ready') : item.pending ? 'Pending Review' : 'Not yet'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Human approval gate */}
          {isComplete && (
            <div
              className="border-t shrink-0"
              style={{
                padding: '10px 20px',
                background: approvalDone ? '#f0fdf4' : '#fffbeb',
                borderColor: approvalDone ? '#bbf7d0' : '#fde68a',
              }}
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  {approvalDone ? (
                    <path d="M2 7l3 3 7-6" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <>
                      <circle cx="7" cy="7" r="5.5" stroke="#b45309" strokeWidth="1.2"/>
                      <path d="M7 4v3.5M7 8.5v.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round"/>
                    </>
                  )}
                </svg>
                <span className="font-bold" style={{ fontSize: 10, color: approvalDone ? '#059669' : '#92400e' }}>
                  {approvalDone
                    ? 'Approved — ClaimCenter write-back authorized'
                    : 'Pending Human Approval — AI prepared, adjuster must review before enterprise write-back'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: AI Runtime Execution ── */}
        <div
          className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div
            className="flex items-center gap-2.5 border-b border-slate-100"
            style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
          >
            <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 26, height: 26, background: BLUE }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="2"  r="1.4" stroke="white" strokeWidth="1.1"/>
                <circle cx="2"   cy="11" r="1.4" stroke="white" strokeWidth="1.1"/>
                <circle cx="11"  cy="11" r="1.4" stroke="white" strokeWidth="1.1"/>
                <path d="M6.5 3.4V7.5M6.5 7.5L2 9.6M6.5 7.5L11 9.6" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>AI Runtime Execution</p>
              <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
                Live LangGraph orchestration and governance evidence
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 20px 14px' }}>
            <div className="space-y-2.5">
              {runtimeRows.map(row => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-500 shrink-0" style={{ fontSize: 10 }}>
                    {row.label}
                  </span>
                  <span
                    className={`font-bold rounded border shrink-0${row.mono ? ' font-mono' : ''}`}
                    style={{
                      fontSize: 9,
                      letterSpacing: row.mono ? '0.02em' : '0.04em',
                      padding: '2px 7px',
                      color:       row.valueColor,
                      background:  row.valueBg,
                      borderColor: row.valueBorder,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Section 5 — Enterprise Adapter Layer
════════════════════════════════════════════════ */
function EnterpriseAdapterLayerPanel({
  backendStatus,
  workflowRun,
}: {
  backendStatus: 'loading' | 'connected' | 'prototype' | null;
  workflowRun: WorkflowRunResult | null;
}) {
  const isConnected = backendStatus === 'connected';

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-slate-100"
        style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-lg flex items-center justify-center shrink-0"
            style={{ width: 26, height: 26, background: '#7c3aed' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="4"   y="1" width="2" height="3" rx="0.5" stroke="white" strokeWidth="1.1"/>
              <rect x="7"   y="1" width="2" height="3" rx="0.5" stroke="white" strokeWidth="1.1"/>
              <path d="M2.5 4h8v2a4 4 0 01-8 0V4z" stroke="white" strokeWidth="1.1" strokeLinejoin="round"/>
              <line x1="6.5" y1="8" x2="6.5" y2="12" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>Enterprise Adapter Layer</p>
            <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
              Bidirectional system access through governed mock MCP contracts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="font-bold rounded-full border"
            style={{ fontSize: 8, letterSpacing: '0.08em', padding: '2px 9px', color: '#059669', background: '#f0fdf4', borderColor: '#bbf7d0' }}
          >
            5 MOCK CONTRACTS ACTIVE
          </span>
          {workflowRun && (
            <span
              className="font-mono font-medium rounded border"
              style={{ fontSize: 8, padding: '2px 7px', color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}
            >
              {workflowRun.adapterEventCount} adapter events
            </span>
          )}
        </div>
      </div>

      {/* Body: two columns */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">

        {/* ── Left: adapter contracts ── */}
        <div style={{ padding: '14px 20px 16px' }}>
          <p className="font-black text-slate-400 uppercase mb-3" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
            Adapter Contracts
          </p>
          <div className="space-y-2">
            {ADAPTER_ROWS.map(row => {
              const ds = DIR_STYLE[row.dirType];
              return (
                <div key={row.system} className="flex items-center gap-3">
                  <span className="font-black text-[#0f3460] shrink-0" style={{ fontSize: 10, minWidth: 80 }}>
                    {row.system}
                  </span>
                  <span
                    className="font-bold rounded border shrink-0 uppercase"
                    style={{ fontSize: 7.5, letterSpacing: '0.06em', padding: '2px 6px', color: ds.color, background: ds.bg, borderColor: ds.border }}
                  >
                    {row.direction}
                  </span>
                  <span
                    className="font-bold rounded border shrink-0"
                    style={{ fontSize: 7.5, letterSpacing: '0.06em', padding: '2px 6px', color: '#059669', background: '#f0fdf4', borderColor: '#bbf7d0' }}
                  >
                    MOCK ACTIVE
                  </span>
                  <span className="font-medium text-slate-400 truncate" style={{ fontSize: 9 }}>
                    {row.purpose}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50"
            style={{ padding: '8px 12px' }}
          >
            <p className="font-medium text-slate-500 leading-snug" style={{ fontSize: 9.5 }}>
              The runtime interacts with enterprise systems through governed adapter contracts. Business workflows remain unchanged while integrations evolve from mock contracts to production connectors.
            </p>
          </div>
        </div>

        {/* ── Right: runtime trace preview ── */}
        <div style={{ padding: '14px 20px 16px' }}>
          <p className="font-black text-slate-400 uppercase mb-3" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
            Runtime Trace Preview
          </p>
          <div className="space-y-1.5">
            {TRACE_EVENTS.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg"
                style={{
                  padding: '5px 9px',
                  background: ev.warn ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${ev.warn ? '#fde68a' : '#e2e8f0'}`,
                  opacity: isConnected ? 1 : 0.65,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14, background: ev.warn ? '#fef3c7' : '#dbeafe', border: `1px solid ${ev.warn ? '#fde68a' : '#bfdbfe'}` }}
                >
                  {ev.warn ? (
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M3.5 2v2.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="3.5" cy="5.5" r="0.5" fill="#b45309"/>
                    </svg>
                  ) : (
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 3.5l1.2 1.2L5.5 2" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span
                  className="font-black shrink-0 rounded"
                  style={{ fontSize: 8, letterSpacing: '0.04em', padding: '1px 5px', color: '#475569', background: '#e2e8f0' }}
                >
                  {ev.system}
                </span>
                <span
                  className="font-medium leading-none"
                  style={{ fontSize: 9.5, color: ev.warn ? '#92400e' : '#374151' }}
                >
                  {ev.event}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className="rounded-full shrink-0"
              style={{ width: 5, height: 5, background: isConnected ? '#4ade80' : '#94a3b8' }}
            />
            <span className="font-medium text-slate-400" style={{ fontSize: 9 }}>
              {isConnected
                ? 'Trace sourced from live LangGraph execution'
                : 'Trace reflects mock contract execution sequence'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Completion banner
════════════════════════════════════════════════ */
function CompletionBanner({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex items-center justify-between gap-8"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a7a 50%, ${BLUE} 100%)`,
        padding: '28px 36px',
        boxShadow: '0 8px 32px rgba(15,52,96,0.25)',
      }}
    >
      <div className="flex items-center gap-6">
        <div
          className="rounded-2xl flex items-center justify-center shrink-0"
          style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="11" stroke="white" strokeWidth="1.6" opacity="0.5"/>
            <path d="M7 13l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-white leading-tight" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>
            Autonomous Workflow Complete
          </p>
          <div className="flex items-center gap-5 mt-2">
            {[
              '5 capabilities executed autonomously',
              '8 manual tasks eliminated',
              'AI package ready for adjuster action',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5L8.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-semibold text-blue-100" style={{ fontSize: 12 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="font-black text-white rounded-2xl flex items-center gap-2.5 shrink-0 transition-all hover:opacity-90 active:scale-[0.97]"
        style={{
          fontSize: 13,
          padding: '14px 28px',
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.30)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        Return to Workspace
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M8 3.5L11.5 7 8 10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
