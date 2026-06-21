import { useState, useEffect, useRef } from 'react';
import type { Claim, ClaimStatus } from '../types';
import type { WorkflowRunResult } from '../services/qarlApi';

interface CapabilityFlags {
  multiPartyAdded: boolean;
  documentationVisited: boolean;
  enrichmentAdded: boolean;
  alertsAdded: boolean;
}

interface Props {
  claim: Claim;
  onBack: () => void;
  onViewDocumentation: () => void;
  onViewMultiParty: () => void;
  onViewEnrichments: () => void;
  onViewAlerts: () => void;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
  capFlags: CapabilityFlags;
  workflowRun?: WorkflowRunResult | null;
  backendStatus?: 'loading' | 'connected' | 'prototype' | null;
  onWorkflowStatus?: (status: ClaimStatus) => void;
  claimCenterWritten?: boolean;
  initialAutonomousState?: AutonomousJourneyState | null;
  onAutonomousStateChange?: (s: AutonomousJourneyState) => void;
}

type ApprovalState = 'awaiting' | 'approving' | 'approved' | 'returned' | 'rejected';

export type WorkflowStage =
  | 'NOT_STARTED'
  | 'RUNNING'
  | 'DOCUMENTATION_REVIEW'
  | 'HUMAN_APPROVAL'
  | 'ENTERPRISE_COMMIT'
  | 'COMPLETED'
  | 'RETURNED'
  | 'REJECTED';

export interface AutonomousJourneyState {
  workflowStage: WorkflowStage;
  autonomousStep: number;
  approvalCommitStep: number;
}

/* ── Design tokens ── */
const BLUE  = '#1976d2';
const NAVY  = '#0f3460';
const CARD_SHADOW = '0 1px 4px rgba(15,52,96,0.06), 0 6px 20px rgba(15,52,96,0.07)';

/* ── Step timing (ms between step advances) ── */
const STEP_DELAY = 1600;
const INITIAL_DELAY = 500;

/* ── Step definitions ── */
function buildSteps(claim: Claim) {
  return [
    {
      num: 1,
      title: 'Context-Driven Clarification',
      icon: <MicIcon />,
      description: 'The adjuster asks contextual follow-up coverage questions based on claimant responses at FNOL.',
      prompt: 'Adjuster: "Confirm policy and coverages"',
      details: [
        { label: 'Account',  value: claim.claimantName },
        { label: 'Policy',   value: claim.policyNumber },
        { label: 'Result',   value: `${claim.lossType} coverage found` },
      ],
      footerLabel: 'Coverage Confirmation',
    },
    {
      num: 2,
      title: 'Multi-Party Conversations',
      icon: <ShieldIcon />,
      description: 'QARL recognizes complexity and orchestrates inputs from adjuster, claimant, independent adjuster, and specialists.',
      prompt: 'Adjuster: "Identify other loss details"',
      details: [
        { label: 'Assessment', value: 'Damage Assessment' },
        { label: 'Type',       value: 'Additional Applicable Loss' },
        { label: 'Result',     value: 'Potential additional exposure identified' },
      ],
      footerLabel: 'Investigation & Evaluation',
    },
    {
      num: 3,
      title: 'Adaptive Documentation Orchestration',
      icon: <WandIcon />,
      description: 'QARL autonomously orchestrates documentation capture, validation, and structured note preparation.',
      prompt: 'Adjuster: "Review and confirm reserve change"',
      details: [
        { label: 'Reserve Review', value: 'Preliminary Agent Report' },
        { label: 'Type',           value: 'Adjuster Reserve Recommendation' },
        { label: 'Result',         value: 'Claim notes and agent updated via email' },
      ],
      footerLabel: 'Documentation & Notes',
    },
    {
      num: 4,
      title: 'Autonomous Enrichment',
      icon: <TargetIcon />,
      description: 'QARL autonomously queries fraud indicators, comparable losses, and risk signals to enrich the claim profile.',
      prompt: 'Adjuster: "Identify if any fraud potential"',
      details: [
        { label: 'ROM Report', value: 'Rough Order of Magnitude' },
        { label: 'Type',       value: 'Measure of Loss' },
        { label: 'Result',     value: 'No fraud determined. Recommendations for payment.' },
      ],
      footerLabel: 'Claims Profile Enrichment',
    },
    {
      num: 5,
      title: 'Proactive Workflow Coordination',
      icon: <RocketIcon />,
      description: 'QARL proactively coordinates specialist updates, SLA alerts, and workflow handoffs without adjuster intervention.',
      prompt: 'Adjuster: "Email agent informing if any updates"',
      details: [
        { label: 'Claim file', value: 'Create a notice and future alert' },
        { label: 'Type',       value: 'Update claim file noting status' },
        { label: 'Result',     value: 'Auto alerts set to match SLAs' },
      ],
      footerLabel: 'Communication',
    },
  ];
}


const STAGE_LABELS = [
  'Initializing',
  'Coverage Confirmation',
  'Investigation & Evaluation',
  'Adaptive Documentation Orchestration',
  'Autonomous Enrichment',
  'Proactive Workflow Coordination',
  'Complete',
];

const MANUAL_TASKS = [
  { label: 'Policy Lookup',          icon: <DocIcon /> },
  { label: 'Data Entry',             icon: <KeyboardIcon /> },
  { label: 'Routing & Coordination', icon: <RouteIcon /> },
  { label: 'Email Preparation',      icon: <MailIcon /> },
];

/* ═══════════════════════════════════════════
   Main page
═══════════════════════════════════════════ */
/* Final elapsed when all steps complete: used as initial value on subsequent visits */
const FINAL_ELAPSED = INITIAL_DELAY + 5 * STEP_DELAY;

export default function PostFnolCoverageJourneyPage({ claim, onBack, onViewDocumentation, onViewMultiParty, onViewEnrichments, onViewAlerts, hasAnimated, onAnimationComplete, capFlags, workflowRun, backendStatus, onWorkflowStatus, claimCenterWritten, initialAutonomousState, onAutonomousStateChange }: Props) {
  const steps = buildSteps(claim);

  /*
   * activeStep:
   *   0 = initializing
   *   1–5 = that step is currently Processing (steps < activeStep are Completed)
   *   6 = all complete
   *
   * When hasAnimated=true (subsequent visits), start directly at 6 (completed state).
   */
  /* workflowStage: single source of truth for the entire workflow lifecycle */
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>(
    initialAutonomousState?.workflowStage
    ?? (hasAnimated ? 'DOCUMENTATION_REVIEW' : 'NOT_STARTED')
  );
  const workflowStarted = workflowStage !== 'NOT_STARTED';

  const [activeStep, setActiveStep] = useState(hasAnimated ? 6 : 0);
  const [elapsed, setElapsed] = useState(hasAnimated ? FINAL_ELAPSED : 0);

  /* Sequential step advancement — only runs when workflow transitions to RUNNING */
  useEffect(() => {
    if (workflowStage !== 'RUNNING' || hasAnimated) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(
        setTimeout(() => {
          setActiveStep(i);
          if (i === 6) {
            onAnimationComplete();
            setWorkflowStage('DOCUMENTATION_REVIEW');
            onWorkflowStatus?.('Awaiting Approval');
          }
        }, INITIAL_DELAY + (i - 1) * STEP_DELAY)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [workflowStage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Elapsed time counter (stops at completion) */
  useEffect(() => {
    if (activeStep >= 6) return;
    const t = setInterval(() => setElapsed(s => s + 100), 100);
    return () => clearInterval(t);
  }, [activeStep]);

  const completedCount = Math.max(0, activeStep - 1);
  const isComplete = activeStep >= 6;

  /* ── Execution mode ── */
  const [executionMode, setExecutionMode] = useState<'manual' | 'autonomous'>(
    initialAutonomousState ? 'autonomous' : 'manual'
  );
  const [autonomousStep, setAutonomousStep] = useState(initialAutonomousState?.autonomousStep ?? 0);
  const [autonomousElapsed, setAutonomousElapsed] = useState(0);

  function startAutonomous() {
    setAutonomousStep(1);
    setAutonomousElapsed(0);
    for (let i = 2; i <= 6; i++) {
      setTimeout(() => {
        setAutonomousStep(i);
        if (i === 6) {
          setWorkflowStage('HUMAN_APPROVAL');
          onWorkflowStatus?.('Awaiting Approval');
        }
      }, (i - 1) * 1400);
    }
  }

  useEffect(() => {
    if (autonomousStep === 0 || autonomousStep >= 6) return;
    const t = setInterval(() => setAutonomousElapsed(s => s + 100), 100);
    return () => clearInterval(t);
  }, [autonomousStep]);

  /* Manual mode: advance to COMPLETED when ClaimCenter write-back completes */
  useEffect(() => {
    if (claimCenterWritten && executionMode === 'manual' && workflowStage === 'DOCUMENTATION_REVIEW') {
      setWorkflowStage('COMPLETED');
      onWorkflowStatus?.('Completed');
    }
  }, [claimCenterWritten]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Single Start Workflow button — kicks off whichever mode is selected */
  function handleStartWorkflow() {
    setWorkflowStage('RUNNING');
    onWorkflowStatus?.('Running');
    if (executionMode === 'autonomous') {
      startAutonomous();
    }
  }

  const [approvalCommitStep, setApprovalCommitStep] = useState(initialAutonomousState?.approvalCommitStep ?? 0);

  /* approvalState: derived from workflowStage — no independent state */
  const approvalState: ApprovalState =
    workflowStage === 'ENTERPRISE_COMMIT' ? 'approving'
    : workflowStage === 'COMPLETED'       ? 'approved'
    : workflowStage === 'RETURNED'        ? 'returned'
    : workflowStage === 'REJECTED'        ? 'rejected'
    : 'awaiting';

  function handleApprove() {
    setWorkflowStage('ENTERPRISE_COMMIT');
    setApprovalCommitStep(1);
    for (let i = 2; i <= 6; i++) {
      setTimeout(() => {
        setApprovalCommitStep(i);
        if (i === 6) {
          setWorkflowStage('COMPLETED');
          onWorkflowStatus?.('Completed');
        }
      }, (i - 1) * 800);
    }
  }

  function handleRequestChanges() {
    setWorkflowStage('RETURNED');
    onWorkflowStatus?.('Returned');
  }

  function handleResubmit() {
    setWorkflowStage('HUMAN_APPROVAL');
    onWorkflowStatus?.('Awaiting Approval');
  }

  function handleRevisePackage() {
    // Expand/focus the governed claim package sections (AiPackageStatusPanel is already visible)
    // No navigation needed — the package review sections are on the same screen
  }

  function handleReject() {
    setWorkflowStage('REJECTED');
    onWorkflowStatus?.('Rejected');
  }

  const effectiveActiveStep     = executionMode === 'autonomous' ? autonomousStep : activeStep;
  const effectiveCompletedCount = Math.max(0, effectiveActiveStep - 1);
  const effectiveIsComplete     = effectiveActiveStep >= 6;
  const effectiveElapsed        = executionMode === 'autonomous' ? autonomousElapsed : elapsed;

  /* Persist autonomous journey state to parent on every change */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (executionMode !== 'autonomous') return;
    onAutonomousStateChange?.({ workflowStage, autonomousStep, approvalCommitStep });
  }, [executionMode, workflowStage, autonomousStep, approvalCommitStep]);

  /* Auto-scroll completion banner into view when workflow finishes */
  const completionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!effectiveIsComplete) return;
    const t = setTimeout(() => {
      completionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 700);
    return () => clearTimeout(t);
  }, [effectiveIsComplete]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: '#f1f5f9' }}>

      {/* ── Page header ── */}
      <div
        className="shrink-0 border-b border-slate-200"
        style={{ background: '#fff', padding: '0 40px', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}
      >
        <div style={{ paddingTop: 24, paddingBottom: 20 }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-[#1976d2] transition-colors mb-4 font-semibold"
            style={{ fontSize: 12 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Workspace
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-black uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.18em', color: BLUE }}>
                AI Execution Journey
              </p>
              <h1 className="font-black leading-tight" style={{ fontSize: 24, color: NAVY, letterSpacing: '-0.02em' }}>
                Post-FNOL Coverage Workflow
              </h1>
              <p className="text-slate-500 font-medium mt-1" style={{ fontSize: 13 }}>
                QARL-generated claim workflow for{' '}
                <span className="font-bold text-[#0f3460]">{claim.claimantName}</span>
                {' '}·{' '}
                <span className="font-mono text-slate-500" style={{ fontSize: 12 }}>{claim.id}</span>
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
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
              {/* Backend status indicator */}
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
      </div>

      {/* ── Execution mode selector ── */}
      <div
        className="shrink-0 border-b border-slate-200"
        style={{ background: '#fff', padding: '10px 40px' }}
      >
        <div className="flex items-center gap-5">
          <div>
            <p className="font-black uppercase" style={{ fontSize: 8, letterSpacing: '0.14em', color: BLUE }}>
              Execution Mode
            </p>
            <p className="font-medium text-slate-400" style={{ fontSize: 10 }}>
              Choose how this claim is processed
            </p>
          </div>
          <div
            className="flex items-center rounded-xl border border-slate-200 bg-slate-50"
            style={{ padding: 4, gap: 4 }}
          >
            <button
              onClick={() => setExecutionMode('manual')}
              style={{
                fontSize: 9, letterSpacing: '0.10em', padding: '7px 16px',
                background: executionMode === 'manual' ? BLUE : 'transparent',
                color: executionMode === 'manual' ? '#fff' : '#64748b',
                boxShadow: executionMode === 'manual' ? '0 2px 6px rgba(25,118,210,0.25)' : 'none',
                border: 'none', cursor: 'pointer', borderRadius: 8,
                fontWeight: 900, textTransform: 'uppercase' as const,
                transition: 'all 0.18s ease',
              }}
            >
              Manual Guided Review
            </button>
            <button
              onClick={() => setExecutionMode('autonomous')}
              style={{
                fontSize: 9, letterSpacing: '0.10em', padding: '7px 16px',
                background: executionMode === 'autonomous' ? BLUE : 'transparent',
                color: executionMode === 'autonomous' ? '#fff' : '#64748b',
                boxShadow: executionMode === 'autonomous' ? '0 2px 6px rgba(25,118,210,0.25)' : 'none',
                border: 'none', cursor: 'pointer', borderRadius: 8,
                fontWeight: 900, textTransform: 'uppercase' as const,
                transition: 'all 0.18s ease',
              }}
            >
              Governed Autonomous Execution
            </button>
          </div>
        </div>
      </div>

      {/* ── Start Workflow gate ── */}
      {!workflowStarted && (
        <div className="flex flex-col items-center justify-center gap-5" style={{ padding: '48px 40px' }}>
          <div className="text-center" style={{ maxWidth: 520 }}>
            <p className="font-black text-[#0f3460] mb-1" style={{ fontSize: 16 }}>
              {executionMode === 'manual' ? 'Manual Guided Review' : 'Governed Autonomous Execution'}
            </p>
            <p className="font-medium text-slate-500 leading-relaxed" style={{ fontSize: 13 }}>
              Choose how this claim should be processed.
            </p>
          </div>
          <button
            onClick={handleStartWorkflow}
            className="flex items-center gap-3 rounded-xl font-black text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              fontSize: 14, padding: '14px 36px',
              background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
              boxShadow: '0 4px 18px rgba(25,118,210,0.35)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="4,2 14,8 4,14" fill="white"/>
            </svg>
            Start Workflow
          </button>
          <p className="font-medium text-slate-400" style={{ fontSize: 11 }}>
            {executionMode === 'manual'
              ? 'Guided step-by-step review with adjuster interaction at each stage'
              : 'QARL orchestrates all 5 capabilities · adjuster reviews and approves the governed package'}
          </p>
        </div>
      )}

      {/* ── Orchestration status strip ── */}
      {workflowStarted && (
        <OrchestrationStrip
          activeStep={effectiveActiveStep}
          completedCount={effectiveCompletedCount}
          elapsed={effectiveElapsed}
          claim={claim}
          isComplete={effectiveIsComplete}
          workflowRun={workflowRun}
          workflowStage={workflowStage}
        />
      )}

      {/* ── Journey canvas ── */}
      {workflowStarted && executionMode === 'autonomous' && (
        <div className="shrink-0" style={{ padding: '28px 40px 0' }}>
          <AutonomousExecutionPanel
            autonomousStep={autonomousStep}
            onStart={startAutonomous}
            approvalState={approvalState}
          />
        </div>
      )}
      {workflowStarted && executionMode === 'manual' && (
      <div className="shrink-0" style={{ padding: '28px 40px 0' }}>

        {/* Section label row */}
        <div className="flex items-center gap-3 mb-5">
          <p className="font-black text-slate-400 uppercase shrink-0" style={{ fontSize: 9, letterSpacing: '0.16em' }}>
            5 AI Capabilities
          </p>
          <div className="h-px flex-1 bg-slate-200" />
          <p className="font-semibold text-slate-400 shrink-0" style={{ fontSize: 11 }}>
            {claim.lossType} · Post-FNOL Flow
          </p>
        </div>

        {/* Cards + connector */}
        <div className="relative">
          {/* Connector track */}
          <div
            className="absolute left-0 right-0 overflow-hidden rounded-full"
            style={{ top: 50, height: 3, margin: '0 76px', zIndex: 0, background: '#e2e8f0' }}
          >
            {/* Progress fill */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(to right, #1976d2, #0f3460)`,
                width: `${Math.min(100, (completedCount / 5) * 100)}%`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
            {/* Shimmer pulse on active section */}
            {!isComplete && (
              <div
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: 60,
                  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.55), transparent)',
                  animation: 'connectorShimmer 1.8s ease-in-out infinite',
                  left: `calc(${Math.min(100, (completedCount / 5) * 100)}% - 30px)`,
                }}
              />
            )}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-5 gap-4 relative" style={{ zIndex: 1 }}>
            {steps.map((step, idx) => {
              const cardStatus =
                idx < completedCount  ? 'completed'
                : idx === completedCount && !isComplete ? 'processing'
                : 'pending';
              // capCompleted tracks whether the adjuster has ACTED on the capability,
              // separate from animation position. Drives green verified styling.
              const capCompleted =
                idx === 0 ? isComplete
                : idx === 1 ? capFlags.multiPartyAdded
                : idx === 2 ? capFlags.documentationVisited
                : idx === 3 ? capFlags.enrichmentAdded
                : capFlags.alertsAdded;
              const ctaDone =
                idx === 1 ? capFlags.multiPartyAdded
                : idx === 2 ? capFlags.documentationVisited
                : idx === 3 ? capFlags.enrichmentAdded
                : idx === 4 ? capFlags.alertsAdded
                : false;
              const ctaLabel =
                idx === 1 ? (capFlags.multiPartyAdded ? 'Added to Documentation' : 'Open Multi-Party Conversations')
                : idx === 2 ? (workflowStage === 'COMPLETED' ? 'Committed to ClaimCenter' : capFlags.documentationVisited ? 'Ready for Review' : undefined)
                : idx === 3 ? (capFlags.enrichmentAdded ? 'Added to Documentation' : 'Open Auto-Enrichments')
                : idx === 4 ? (capFlags.alertsAdded ? 'Added to Documentation' : 'Open Workflow Coordination')
                : undefined;
              return (
                <CapabilityCard
                  key={step.num}
                  step={step}
                  status={cardStatus}
                  capCompleted={capCompleted}
                  onClick={idx === 2 ? onViewDocumentation : idx === 1 ? onViewMultiParty : idx === 3 ? onViewEnrichments : idx === 4 ? onViewAlerts : undefined}
                  ctaLabel={ctaLabel}
                  ctaDone={ctaDone}
                />
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── Three-column row ── */}
      {workflowStarted && <div className="shrink-0 grid grid-cols-3 gap-5" style={{ padding: '24px 40px 0' }}>
        <AiPackageStatusPanel
          isComplete={effectiveIsComplete}
          capFlags={capFlags}
          workflowRun={workflowRun}
          claim={claim}
          workflowStage={workflowStage}
          approvalState={approvalState}
          showReviewSections={executionMode === 'autonomous'}
          approvalCommitStep={executionMode === 'autonomous' ? approvalCommitStep : 0}
          onApprove={handleApprove}
          onRequestChanges={handleRequestChanges}
          onReject={handleReject}
          onResubmit={handleResubmit}
          onRevisePackage={handleRevisePackage}
        />
        <ArchitectureProofPanel
          backendStatus={backendStatus}
          workflowRun={workflowRun}
          approvalState={workflowStage === 'HUMAN_APPROVAL' || workflowStage === 'ENTERPRISE_COMMIT' || workflowStage === 'COMPLETED' || workflowStage === 'RETURNED' || workflowStage === 'REJECTED' ? approvalState : undefined}
        />
        <ManualEliminationBanner
          isComplete={effectiveIsComplete}
          autonomousStep={executionMode === 'autonomous' ? autonomousStep : undefined}
        />
      </div>}

      {/* ── Enterprise Actions Executed ── */}
      {workflowStarted && <div className="shrink-0" style={{ padding: '20px 40px 0' }}>
        <EnterpriseAdapterLayerPanel
          backendStatus={backendStatus}
          workflowRun={workflowRun}
          approvalState={workflowStage === 'HUMAN_APPROVAL' || workflowStage === 'ENTERPRISE_COMMIT' || workflowStage === 'COMPLETED' || workflowStage === 'RETURNED' || workflowStage === 'REJECTED' ? approvalState : undefined}
        />
      </div>}

      {/* ── Completion banner ── */}
      <div
        ref={completionRef}
        className="shrink-0"
        style={{
          padding: '24px 40px 40px',
          overflow: 'hidden',
          maxHeight: effectiveIsComplete ? 280 : 0,
          opacity: effectiveIsComplete ? 1 : 0,
          transition: 'max-height 0.6s ease, opacity 0.5s ease',
        }}
      >
        <CompletionBanner onBack={onBack} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Orchestration status strip
═══════════════════════════════════════════ */
function OrchestrationStrip({
  activeStep, completedCount, elapsed, claim, isComplete, workflowRun, workflowStage,
}: {
  activeStep: number; completedCount: number; elapsed: number; claim: Claim; isComplete: boolean; workflowRun?: WorkflowRunResult | null; workflowStage: WorkflowStage;
}) {
  const elapsedSec = (elapsed / 1000).toFixed(1);

  const stage =
    workflowStage === 'COMPLETED'              ? 'Workflow Complete'
    : workflowStage === 'ENTERPRISE_COMMIT'    ? 'Enterprise Commit'
    : workflowStage === 'RETURNED'             ? 'Returned for Review'
    : workflowStage === 'REJECTED'             ? 'Execution Closed'
    : workflowStage === 'HUMAN_APPROVAL'       ? 'Human Approval'
    : workflowStage === 'DOCUMENTATION_REVIEW' ? 'Documentation Review'
    : STAGE_LABELS[Math.min(activeStep, 6)];

  // Use backend values when available and workflow is complete
  const backendReady = isComplete && !!workflowRun;
  const confidence = backendReady ? `${workflowRun!.coverageConfidence}%` : completedCount >= 1 ? '98%' : '—';
  // Sub-second backend times reflect pure compute, not the full adjuster interaction window.
  // Show animation elapsed time when backend completes in < 1000 ms for accurate presentation.
  const execTime = backendReady && workflowRun!.executionTimeMs >= 1000
    ? `${(workflowRun!.executionTimeMs / 1000).toFixed(1)}s`
    : isComplete ? `${elapsedSec}s` : `${elapsedSec}s…`;

  const stats = [
    { label: 'Current Stage',       value: stage,      mono: false },
    { label: 'Coverage Confidence', value: confidence, mono: true  },
    { label: 'Execution Time',      value: execTime,   mono: true  },
  ];

  return (
    <div
      className="shrink-0 border-b border-slate-200"
      style={{ background: NAVY, padding: '0 40px' }}
    >
      <div className="flex items-stretch gap-0">
        {/* QARL label */}
        <div
          className="flex items-center gap-3 pr-8 mr-0 shrink-0 border-r"
          style={{ borderColor: 'rgba(255,255,255,0.10)', padding: '14px 0' }}
        >
          <div
            className="rounded-xl flex items-center justify-center shrink-0"
            style={{
              width: 30, height: 30,
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
            <p className="font-black text-white leading-none" style={{ fontSize: 11, letterSpacing: '-0.01em' }}>
              QARL
            </p>
            <p className="font-bold text-blue-300 leading-none mt-0.5 uppercase" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
              Orchestration Engine
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-1 items-stretch">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col justify-center px-6 border-r"
              style={{ borderColor: 'rgba(255,255,255,0.08)', flex: i === 0 ? '1.5' : '1' }}
            >
              <p className="font-bold text-blue-300 uppercase leading-none mb-1" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
                {stat.label}
              </p>
              <p
                className={`font-black text-white leading-none ${stat.mono ? 'font-mono' : ''}`}
                style={{ fontSize: i === 0 ? 12 : 13 }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Claim context */}
        <div
          className="flex flex-col justify-center pl-6 shrink-0"
          style={{ padding: '14px 0 14px 24px' }}
        >
          <p className="font-bold text-blue-300 uppercase leading-none mb-1" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
            Claim Context
          </p>
          <p className="font-black text-white leading-tight" style={{ fontSize: 11 }}>
            {claim.claimantName}
          </p>
          <p className="font-medium text-blue-300 leading-none mt-0.5" style={{ fontSize: 10 }}>
            {claim.lossType} · {claim.id}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Autonomous Execution Panel
═══════════════════════════════════════════ */
const COMMIT_ACTIONS = [
  { system: 'ClaimCenter',  label: 'Writing claim file…',             doneLabel: 'Claim file written' },
  { system: 'Outlook',      label: 'Sending adjuster notification…',  doneLabel: 'Notification sent' },
  { system: 'Governance',   label: 'Publishing governance event…',    doneLabel: 'Governance event published' },
  { system: 'Audit Ledger', label: 'Publishing audit record…',        doneLabel: 'Audit record published' },
  { system: 'Workflow Bus', label: 'Completing workflow…',            doneLabel: 'Workflow complete' },
];

const AUTO_STAGE_LABELS = [
  'Coverage Confirmation',
  'Investigation & Evaluation',
  'Adaptive Documentation Orchestration',
  'Autonomous Enrichment',
  'Proactive Workflow Coordination',
];

function AutonomousExecutionPanel({
  autonomousStep,
  onStart,
  approvalState,
}: {
  autonomousStep: number;
  onStart: () => void;
  approvalState: ApprovalState;
}) {
  const isRunning = autonomousStep > 0 && autonomousStep < 6;
  const isDone    = autonomousStep >= 6;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-slate-100"
        style={{ padding: '14px 24px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl flex items-center justify-center shrink-0"
            style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`, boxShadow: '0 2px 8px rgba(25,118,210,0.30)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.3"/>
              <path d="M4.5 7l2 2L9.5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 13 }}>
              Governed Autonomous Execution
            </p>
            <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
              QARL orchestrates all 5 capabilities — adjuster retains full approval authority
            </p>
          </div>
        </div>
        {isDone && (
          <span className="font-black rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
                style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
            EXECUTION COMPLETE
          </span>
        )}
        {isRunning && (
          <span className="font-black rounded-full border border-blue-200 bg-blue-50 text-[#1976d2] animate-pulse"
                style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
            AUTONOMOUS EXECUTION RUNNING
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '24px' }}>
        {autonomousStep === 0 ? (
          <div className="flex flex-col items-center gap-6" style={{ padding: '16px 0' }}>
            <div className="text-center" style={{ maxWidth: 540 }}>
              <p className="font-black text-[#0f3460] mb-2" style={{ fontSize: 15 }}>
                QARL Autonomous Workflow
              </p>
              <p className="font-medium text-slate-500 leading-relaxed" style={{ fontSize: 12 }}>
                QARL will orchestrate all 5 capabilities autonomously under adjuster supervision.
                Each step requires no manual interaction. Adjuster retains full approval authority
                over all system actions and the final governed claim package.
              </p>
            </div>
            {/* Stage preview chips */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {AUTO_STAGE_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-400"
                        style={{ fontSize: 8, letterSpacing: '0.06em', padding: '3px 10px' }}>
                    {label}
                  </span>
                  {i < AUTO_STAGE_LABELS.length - 1 && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5h6M6 3l2 2-2 2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onStart}
              className="flex items-center gap-2.5 rounded-xl font-black text-white transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                fontSize: 13, padding: '13px 32px',
                background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
                boxShadow: '0 4px 16px rgba(25,118,210,0.35)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polygon points="3,2 12,7 3,12" fill="white"/>
              </svg>
              Start Autonomous Execution
            </button>
            <p className="font-medium text-slate-400" style={{ fontSize: 10 }}>
              All system actions require human approval before taking effect
            </p>
          </div>
        ) : (
          <div>
            {/* Pipeline */}
            <div className="flex items-start gap-0 mb-6">
              {AUTO_STAGE_LABELS.map((label, i) => {
                const stageNum   = i + 1;
                const stageDone   = autonomousStep > stageNum;
                const stageActive = autonomousStep === stageNum;
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1" style={{ minWidth: 0 }}>
                      <div
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 38, height: 38,
                          background: stageDone
                            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            : stageActive
                            ? `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`
                            : '#f1f5f9',
                          border: stageDone ? '2px solid #059669' : stageActive ? `2px solid ${BLUE}` : '2px solid #e2e8f0',
                          boxShadow: stageActive ? '0 0 0 4px rgba(25,118,210,0.15)' : 'none',
                          transition: 'all 0.4s ease',
                        }}
                      >
                        {stageDone ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : stageActive ? (
                          <span className="rounded-full bg-white shrink-0" style={{ width: 10, height: 10 }} />
                        ) : (
                          <span className="font-black text-slate-400" style={{ fontSize: 12 }}>{stageNum}</span>
                        )}
                      </div>
                      <p className="font-semibold text-center leading-tight mt-2"
                         style={{ fontSize: 9, color: stageDone ? '#059669' : stageActive ? BLUE : '#94a3b8', maxWidth: 90 }}>
                        {label}
                      </p>
                      {stageActive && (
                        <span className="font-bold text-[#1976d2] animate-pulse mt-0.5" style={{ fontSize: 8 }}>
                          Processing…
                        </span>
                      )}
                    </div>
                    {i < AUTO_STAGE_LABELS.length - 1 && (
                      <div className="shrink-0" style={{
                        width: 20, height: 2, marginBottom: 32,
                        background: autonomousStep > i + 1 ? '#059669' : '#e2e8f0',
                        transition: 'background 0.4s ease',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Execution status banner */}
            {isDone && (
              <div
                className="rounded-xl border flex items-center gap-4"
                style={{
                  padding: '14px 20px',
                  background: approvalState === 'approved' ? '#f0fdf4' : approvalState === 'rejected' ? '#fef2f2' : approvalState === 'returned' ? '#fffbeb' : '#f0fdf4',
                  borderColor: approvalState === 'approved' ? '#bbf7d0' : approvalState === 'rejected' ? '#fecaca' : approvalState === 'returned' ? '#fde68a' : '#bbf7d0',
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{
                    width: 38, height: 38,
                    background: approvalState === 'approved' ? '#d1fae5' : approvalState === 'rejected' ? '#fee2e2' : approvalState === 'returned' ? '#fef3c7' : '#d1fae5',
                    border: `2px solid ${approvalState === 'approved' ? '#6ee7b7' : approvalState === 'rejected' ? '#fca5a5' : approvalState === 'returned' ? '#fde68a' : '#6ee7b7'}`,
                  }}
                >
                  {approvalState === 'approved' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : approvalState === 'rejected' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 4l6 6M10 4l-6 6" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : approvalState === 'returned' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 3v4M7 9v1.5" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="font-black leading-none"
                    style={{
                      fontSize: 13,
                      color: approvalState === 'approved' ? '#065f46' : approvalState === 'rejected' ? '#7f1d1d' : approvalState === 'returned' ? '#78350f' : '#065f46',
                    }}
                  >
                    {approvalState === 'approved' ? 'Workflow Complete — Enterprise Systems Updated' :
                     approvalState === 'rejected' ? 'Execution Closed — Package Rejected' :
                     approvalState === 'returned' ? 'Returned for Review — No Systems Written' :
                     'Governed Claim Package Ready'}
                  </p>
                  <p
                    className="font-semibold mt-0.5 leading-snug"
                    style={{
                      fontSize: 10,
                      color: approvalState === 'approved' ? '#059669' : approvalState === 'rejected' ? '#dc2626' : approvalState === 'returned' ? '#b45309' : '#059669',
                    }}
                  >
                    {approvalState === 'approved' ? 'Human approval recorded · Audit trail published · All enterprise actions committed' :
                     approvalState === 'rejected' ? 'No enterprise systems written · Audit record retained' :
                     approvalState === 'returned' ? 'Package returned to AI Runtime · Adjuster changes requested' :
                     approvalState === 'approving' ? 'Committing to enterprise systems…' :
                     '5 capabilities executed · Review the Governed Claim Package below before approving'}
                  </p>
                </div>
                <span
                  className="font-black rounded-full border shrink-0"
                  style={{
                    fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px',
                    color: approvalState === 'approved' ? '#059669' : approvalState === 'rejected' ? '#dc2626' : approvalState === 'returned' ? '#b45309' : '#b45309',
                    background: approvalState === 'approved' ? '#d1fae5' : approvalState === 'rejected' ? '#fee2e2' : approvalState === 'returned' ? '#fef3c7' : '#fef3c7',
                    borderColor: approvalState === 'approved' ? '#6ee7b7' : approvalState === 'rejected' ? '#fca5a5' : approvalState === 'returned' ? '#fde68a' : '#fde68a',
                  }}
                >
                  {approvalState === 'approved' ? 'APPROVED' : approvalState === 'rejected' ? 'REJECTED' : approvalState === 'returned' ? 'RETURNED' : 'PENDING APPROVAL'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Human Approval Gate
═══════════════════════════════════════════ */
function HumanApprovalGate({
  approvalState,
  approvalCommitStep,
  onApprove,
  onRequestChanges,
  onReject,
  onResubmit,
  onRevisePackage,
}: {
  approvalState: ApprovalState;
  approvalCommitStep: number;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  onResubmit: () => void;
  onRevisePackage: () => void;
}) {
  if (approvalState === 'approved') {
    return (
      <div className="rounded-xl border border-emerald-200 flex items-center gap-4"
           style={{ padding: '16px 20px', background: '#f0fdf4' }}>
        <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0"
             style={{ width: 42, height: 42, border: '2px solid #bbf7d0' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 9l3.5 3.5L14.5 5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-emerald-800 leading-none" style={{ fontSize: 14 }}>Workflow Complete</p>
          <p className="font-semibold text-emerald-600 mt-0.5" style={{ fontSize: 11 }}>
            Human approval granted · All enterprise systems updated · Governance audit published
          </p>
        </div>
        <span className="font-black rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700 shrink-0"
              style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
          APPROVED
        </span>
      </div>
    );
  }

  if (approvalState === 'returned') {
    return (
      <div className="rounded-xl border border-amber-200 overflow-hidden" style={{ background: '#fffbeb' }}>
        <div className="flex items-start gap-4 border-b border-amber-100" style={{ padding: '16px 20px' }}>
          <div className="rounded-full bg-amber-100 flex items-center justify-center shrink-0"
               style={{ width: 42, height: 42, border: '2px solid #fde68a' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 4v5.5M9 11.5v1.5" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-800 leading-none" style={{ fontSize: 14 }}>Changes Requested</p>
            <p className="font-semibold text-amber-700 mt-1 leading-snug" style={{ fontSize: 11 }}>
              No enterprise systems were written. The governed package has been returned for revision.
              Review the package below and resubmit when ready.
            </p>
          </div>
          <span className="font-black rounded-full border border-amber-300 bg-amber-50 text-amber-700 shrink-0"
                style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
            CHANGES REQUESTED
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ padding: '14px 20px' }}>
          <button
            onClick={onRevisePackage}
            className="flex items-center gap-2 rounded-xl font-black transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ fontSize: 12, padding: '10px 22px', background: '#fef3c7', color: '#92400e',
                     border: '1.5px solid #fde68a', cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 10h8M7.5 2.5l2 2-5 5H2.5v-2l5-5z" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Revise Package
          </button>
          <button
            onClick={onResubmit}
            className="flex items-center gap-2 rounded-xl font-black text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ fontSize: 12, padding: '10px 22px', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                     boxShadow: '0 3px 12px rgba(180,83,9,0.30)', border: 'none', cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6a4 4 0 107.9-1M10 2v3H7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Resubmit for Approval
          </button>
        </div>
      </div>
    );
  }

  if (approvalState === 'rejected') {
    return (
      <div className="rounded-xl border border-red-200 flex items-center gap-4"
           style={{ padding: '16px 20px', background: '#fef2f2' }}>
        <div className="rounded-full bg-red-100 flex items-center justify-center shrink-0"
             style={{ width: 42, height: 42, border: '2px solid #fecaca' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 5l8 8M13 5l-8 8" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-red-800 leading-none" style={{ fontSize: 14 }}>Execution Closed</p>
          <p className="font-semibold text-red-600 mt-0.5" style={{ fontSize: 11 }}>
            Package rejected · No enterprise systems written · Claim returned to manual workflow
          </p>
        </div>
        <span className="font-black rounded-full border border-red-300 bg-red-50 text-red-700 shrink-0"
              style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
          REJECTED
        </span>
      </div>
    );
  }

  if (approvalState === 'approving') {
    return (
      <div className="rounded-xl border border-blue-200 overflow-hidden"
           style={{ background: '#eff6ff' }}>
        <div className="flex items-center gap-3 border-b border-blue-100" style={{ padding: '12px 20px' }}>
          <span className="font-black text-[#1976d2] animate-pulse" style={{ fontSize: 12 }}>
            Enterprise Commit in Progress…
          </span>
          <span className="font-black rounded-full border border-blue-200 bg-blue-50 text-[#1976d2] animate-pulse"
                style={{ fontSize: 8, letterSpacing: '0.10em', padding: '2px 10px' }}>
            COMMITTING
          </span>
        </div>
        <div className="space-y-1.5" style={{ padding: '12px 20px 14px' }}>
          {COMMIT_ACTIONS.map((action, i) => {
            const step = i + 1;
            const done   = approvalCommitStep > step;
            const active = approvalCommitStep === step;
            return (
              <div key={action.system} className="flex items-center gap-3 rounded-lg"
                   style={{ padding: '6px 10px', background: done ? '#f0fdf4' : active ? '#fff' : '#f8fafc',
                            border: `1px solid ${done ? '#bbf7d0' : active ? '#bfdbfe' : '#e2e8f0'}` }}>
                <div className="rounded-full flex items-center justify-center shrink-0"
                     style={{ width: 16, height: 16, background: done ? '#059669' : active ? BLUE : '#e2e8f0' }}>
                  {done ? (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.5 1.5L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : active ? (
                    <span className="rounded-full bg-white" style={{ width: 6, height: 6 }} />
                  ) : (
                    <span className="font-black text-slate-400" style={{ fontSize: 8 }}>{step}</span>
                  )}
                </div>
                <span className="font-black shrink-0 rounded" style={{ fontSize: 8, padding: '1px 5px', color: '#475569', background: '#e2e8f0' }}>
                  {action.system}
                </span>
                <span className="font-semibold" style={{ fontSize: 10, color: done ? '#059669' : active ? BLUE : '#94a3b8' }}>
                  {done ? action.doneLabel : active ? action.label : action.label}
                </span>
                {active && <span className="font-bold text-[#1976d2] animate-pulse ml-auto" style={{ fontSize: 8 }}>Running…</span>}
                {done && <span className="font-bold text-emerald-600 ml-auto" style={{ fontSize: 8 }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* awaiting */
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden" style={{ background: '#fafbfc' }}>
      <div className="flex items-start gap-4 border-b border-slate-100" style={{ padding: '16px 20px' }}>
        <div className="rounded-full bg-amber-100 flex items-center justify-center shrink-0"
             style={{ width: 42, height: 42, border: '2px solid #fde68a' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="#b45309" strokeWidth="1.6"/>
            <path d="M9 5v5" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="9" cy="12.5" r="0.9" fill="#b45309"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 14 }}>Human Approval Gate</p>
          <p className="font-semibold text-slate-500 mt-1 leading-snug" style={{ fontSize: 11 }}>
            Governed Claim Package ready · 5 capabilities executed · All system actions pending adjuster decision.
            No enterprise systems have been written. Your approval authorises the enterprise commit sequence.
          </p>
        </div>
        <span className="font-black rounded-full border border-amber-200 bg-amber-50 text-amber-700 shrink-0"
              style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px' }}>
          PENDING APPROVAL
        </span>
      </div>
      <div className="flex items-center gap-3" style={{ padding: '14px 20px' }}>
        <button
          onClick={onApprove}
          className="flex items-center gap-2 rounded-xl font-black text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ fontSize: 12, padding: '10px 22px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                   boxShadow: '0 3px 12px rgba(5,150,105,0.35)', border: 'none', cursor: 'pointer' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Approve Package
        </button>
        <button
          onClick={onRequestChanges}
          className="flex items-center gap-2 rounded-xl font-black transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ fontSize: 12, padding: '10px 22px', background: '#fffbeb', color: '#b45309',
                   border: '1.5px solid #fde68a', cursor: 'pointer' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v4M6 8v1.5" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Request Changes
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-2 rounded-xl font-black transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ fontSize: 12, padding: '10px 22px', background: '#fef2f2', color: '#dc2626',
                   border: '1.5px solid #fecaca', cursor: 'pointer' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Reject Package
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Capability card
═══════════════════════════════════════════ */
interface StepDef {
  num: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
  details: { label: string; value: string }[];
  footerLabel: string;
}

type CardStatus = 'completed' | 'processing' | 'pending';

function CapabilityCard({ step, status, capCompleted = false, onClick, ctaLabel, ctaDone }: { step: StepDef; status: CardStatus; capCompleted?: boolean; onClick?: () => void; ctaLabel?: string; ctaDone?: boolean }) {
  const [hovered, setHovered] = useState(false);

  const isCompleted  = status === 'completed';
  const isProcessing = status === 'processing';
  const isPending    = status === 'pending';
  const isClickable  = !!onClick;
  const showCTA      = isClickable && isCompleted;

  /* ── Dynamic border ── */
  const border = showCTA && hovered ? BLUE
               : isCompleted        ? '#bbf7d0'
               : isProcessing       ? BLUE
               :                      '#e2e8f0';

  /* ── Dynamic shadow ── */
  const shadow = showCTA && hovered
    ? '0 12px 28px rgba(25,118,210,0.18), 0 2px 8px rgba(15,52,96,0.10), 0 0 0 2px rgba(25,118,210,0.12)'
    : isProcessing
    ? `${CARD_SHADOW}, 0 0 0 3px rgba(25,118,210,0.15)`
    : CARD_SHADOW;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { if (isClickable) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? (ctaLabel ?? 'Open Interactive Documentation Workspace') : undefined}
      className="flex flex-col rounded-2xl bg-white overflow-hidden relative"
      style={{
        border: `1.5px solid ${border}`,
        boxShadow: shadow,
        opacity: isPending ? 0.55 : 1,
        transform: showCTA && hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.4s ease, transform 0.18s ease',
        cursor: isClickable ? 'pointer' : 'default',
        outline: 'none',
      }}
    >
      {/* ── Corner ribbon (clickable + completed only) ── */}
      {showCTA && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 16,
            right: -30,
            width: 110,
            background: ctaDone ? '#059669' : BLUE,
            transform: 'rotate(45deg)',
            textAlign: 'center',
            padding: '4px 0 3px',
            pointerEvents: 'none',
            boxShadow: ctaDone ? '0 2px 6px rgba(5,150,105,0.35)' : '0 2px 6px rgba(25,118,210,0.35)',
            zIndex: 10,
          }}
        >
          <span
            className="text-white font-black uppercase tracking-widest block"
            style={{ fontSize: 6.5, letterSpacing: '0.14em', lineHeight: 1.5 }}
          >
            {ctaDone ? 'DONE' : 'NEXT STEP'}
          </span>
        </div>
      )}

      {/* ── Top: number badge + status pill ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <div
          className="rounded-full flex items-center justify-center font-black text-white shrink-0"
          style={{
            width: 28, height: 28,
            background: isCompleted
              ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
              : `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
            fontSize: 12,
            boxShadow: isCompleted
              ? '0 2px 6px rgba(5,150,105,0.30)'
              : '0 2px 6px rgba(25,118,210,0.30)',
            transition: 'background 0.4s ease',
          }}
        >
          {isCompleted ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : step.num}
        </div>
        <StatusPill status={status} capCompleted={capCompleted} />
      </div>

      {/* ── Icon ── */}
      <div className="px-4 pb-3">
        <div
          className="rounded-xl flex items-center justify-center"
          style={{
            width: 34, height: 34,
            background: capCompleted ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${capCompleted ? '#bbf7d0' : '#bfdbfe'}`,
            color: showCTA && hovered ? BLUE : capCompleted ? '#059669' : BLUE,
            transform: showCTA && hovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'background 0.4s ease, border-color 0.4s ease, color 0.18s ease, transform 0.18s ease',
          }}
        >
          {step.icon}
        </div>
      </div>

      {/* ── Title + description ── */}
      <div className="px-4 pb-3 border-b border-slate-100">
        <h3
          className="font-black leading-snug mb-1.5"
          style={{
            fontSize: 13,
            color: showCTA && hovered ? BLUE : NAVY,
            letterSpacing: '-0.01em',
            transition: 'color 0.18s ease',
          }}
        >
          {step.title}
        </h3>
        <p className="font-medium text-slate-500 leading-snug" style={{ fontSize: 11 }}>
          {step.description}
        </p>
      </div>

      {/* ── Prompt ── */}
      <div className="px-4 pt-3 pb-2">
        <p className="font-black uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.14em', color: '#94a3b8' }}>
          Prompt
        </p>
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-600"
          style={{ fontSize: 11, padding: '7px 10px', lineHeight: 1.4 }}
        >
          {step.prompt}
        </div>
      </div>

      {/* ── Verified details ── */}
      <div className="px-4 pt-1 pb-3">
        <p className="font-black uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.14em', color: '#94a3b8' }}>
          Verified Details
        </p>
        <div
          className="rounded-lg border"
          style={{
            background: capCompleted ? '#f0fdf4' : '#eff6ff',
            borderColor: capCompleted ? '#bbf7d0' : '#bfdbfe',
            padding: '8px 10px',
            transition: 'background 0.4s ease, border-color 0.4s ease',
          }}
        >
          {step.details.map((d, i) => (
            <div key={i} className={`flex gap-2 ${i < step.details.length - 1 ? 'mb-1.5' : ''}`}>
              <span
                className="font-black shrink-0 uppercase"
                style={{ fontSize: 9, letterSpacing: '0.06em', color: capCompleted ? '#059669' : BLUE, minWidth: 56, paddingTop: 1, transition: 'color 0.4s' }}
              >
                {d.label}:
              </span>
              <span className="font-semibold text-slate-700 leading-snug" style={{ fontSize: 10 }}>
                {d.value}
              </span>
            </div>
          ))}
          {/* Verified row */}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: capCompleted ? '#bbf7d0' : '#bfdbfe' }}>
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{ width: 14, height: 14, background: capCompleted ? '#d1fae5' : '#dbeafe' }}
            >
              {capCompleted ? (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                  <circle cx="3.5" cy="3.5" r="2.5" stroke={BLUE} strokeWidth="1.2"/>
                  <path d="M3.5 2v2l1 1" stroke={BLUE} strokeWidth="1" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <span className="font-bold" style={{ fontSize: 9, color: capCompleted ? '#059669' : BLUE }}>
              {capCompleted ? 'Verified' : isCompleted ? 'Available' : isProcessing ? 'Processing…' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer: amber chip row (non-CTA cards) ── */}
      {!showCTA && (
        <div
          className="mt-auto border-t border-slate-100 flex items-center justify-between gap-2"
          style={{ padding: '8px 12px', background: 'rgba(248,250,252,0.9)' }}
        >
          <span
            className="font-black rounded-full border"
            style={{ fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
          >
            {step.footerLabel}
          </span>
          {isProcessing && (
            <span className="font-bold text-[#1976d2] animate-pulse" style={{ fontSize: 9 }}>
              Running…
            </span>
          )}
        </div>
      )}

      {/* ── CTA strip (clickable + completed only) ── */}
      {showCTA && (
        <div
          className="mt-auto border-t border-blue-100 flex flex-col items-center justify-center"
          style={{
            padding: '10px 14px 11px',
            background: hovered ? '#dbeafe' : '#eff6ff',
            transition: 'background 0.18s ease',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="font-bold"
              style={{
                fontSize: 12,
                color: BLUE,
                textDecoration: hovered ? 'underline' : 'none',
                textUnderlineOffset: 3,
                transition: 'text-decoration 0.18s ease',
              }}
            >
              {ctaLabel ?? 'Open Interactive Documentation'}
            </span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              style={{
                color: BLUE,
                transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                transition: 'transform 0.18s ease',
                flexShrink: 0,
              }}
            >
              <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, capCompleted }: { status: CardStatus; capCompleted: boolean }) {
  if (status === 'completed') {
    if (capCompleted) {
      return (
        <span
          className="font-bold rounded-full border flex items-center gap-1"
          style={{ fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
            <path d="M1 3.5l2 2L6 1.5" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Completed
        </span>
      );
    }
    return (
      <span
        className="font-bold rounded-full border"
        style={{ fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
      >
        Available
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span
        className="font-bold rounded-full border flex items-center gap-1.5 animate-pulse"
        style={{ fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
      >
        <span className="rounded-full bg-[#1976d2] shrink-0" style={{ width: 5, height: 5 }} />
        Processing
      </span>
    );
  }
  return (
    <span
      className="font-bold rounded-full border"
      style={{ fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }}
    >
      Pending
    </span>
  );
}


/* ═══════════════════════════════════════════
   AI Package Status panel
═══════════════════════════════════════════ */
function ReviewSection({
  title,
  rows,
  expanded,
  onToggle,
}: {
  title: string;
  rows: { label: string; value: string; highlight?: 'green' | 'amber' | 'blue' | 'red' }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 transition-colors hover:bg-slate-50"
        style={{ padding: '9px 14px', background: expanded ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0" style={{ width: 15, height: 15 }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-slate-700 leading-none" style={{ fontSize: 11 }}>{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold uppercase" style={{ fontSize: 8, letterSpacing: '0.08em', color: expanded ? BLUE : '#94a3b8' }}>
            {expanded ? '▲ Hide' : '▼ Review'}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100" style={{ padding: '10px 14px 12px', background: '#fafbfc' }}>
          <div className="space-y-2">
            {rows.map((row, i) => {
              const valueColor =
                row.highlight === 'green' ? '#059669' :
                row.highlight === 'amber' ? '#b45309' :
                row.highlight === 'blue'  ? BLUE :
                row.highlight === 'red'   ? '#dc2626' : '#374151';
              const valueBg =
                row.highlight === 'green' ? '#f0fdf4' :
                row.highlight === 'amber' ? '#fffbeb' :
                row.highlight === 'blue'  ? '#eff6ff' :
                row.highlight === 'red'   ? '#fef2f2' : '#f1f5f9';
              const valueBorder =
                row.highlight === 'green' ? '#bbf7d0' :
                row.highlight === 'amber' ? '#fde68a' :
                row.highlight === 'blue'  ? '#bfdbfe' :
                row.highlight === 'red'   ? '#fecaca' : '#e2e8f0';
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-black text-slate-400 shrink-0 uppercase" style={{ fontSize: 8, letterSpacing: '0.06em', paddingTop: 3, minWidth: 110 }}>{row.label}</span>
                  <span className="font-semibold rounded border leading-snug" style={{ fontSize: 9.5, padding: '2px 7px', color: valueColor, background: valueBg, borderColor: valueBorder }}>
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Shared helper — derives Package Status label from single workflowStage source of truth */
function packageStatusLabel(workflowStage: WorkflowStage): { text: string; color: string } {
  switch (workflowStage) {
    case 'NOT_STARTED':
    case 'RUNNING':
      return { text: 'Governed Claim Package Being Assembled', color: '#94a3b8' };
    case 'DOCUMENTATION_REVIEW':
      return { text: 'Governed Claim Package Ready · Awaiting Documentation Review', color: '#b45309' };
    case 'HUMAN_APPROVAL':
      return { text: 'Governed Claim Package Ready · Awaiting Human Approval', color: '#b45309' };
    case 'ENTERPRISE_COMMIT':
      return { text: 'Governed Claim Package Approved · Enterprise Commit in Progress', color: '#059669' };
    case 'COMPLETED':
      return { text: 'Governed Claim Package Approved · Enterprise Commit Completed', color: '#059669' };
    case 'RETURNED':
      return { text: 'Governed Claim Package Returned · Awaiting Revision', color: '#b45309' };
    case 'REJECTED':
      return { text: 'Governed Claim Package Rejected · Workflow Closed', color: '#dc2626' };
  }
}

function AiPackageStatusPanel({
  isComplete,
  capFlags: _capFlags,
  workflowRun,
  claim,
  workflowStage,
  approvalState,
  showReviewSections,
  approvalCommitStep,
  onApprove,
  onRequestChanges,
  onReject,
  onResubmit,
  onRevisePackage,
}: {
  isComplete: boolean;
  capFlags: CapabilityFlags;
  workflowRun?: WorkflowRunResult | null;
  claim?: import('../types').Claim;
  workflowStage?: WorkflowStage;
  approvalState?: ApprovalState;
  showReviewSections?: boolean;
  approvalCommitStep?: number;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onReject?: () => void;
  onResubmit?: () => void;
  onRevisePackage?: () => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const isAutonomousMode = showReviewSections ?? false;

  const claimantName = claim?.claimantName ?? 'Claimant';
  const policyNumber  = claim?.policyNumber  ?? '—';
  const lossType      = claim?.lossType      ?? 'Loss';
  const reserve       = claim?.reserve       ?? 0;
  const sla           = claim?.slaDaysRemaining ?? 0;
  const dateOfLoss    = claim?.dateOfLoss    ?? '—';

  const sections = [
    {
      key: 'coverage',
      title: 'Coverage Verification',
      rows: [
        { label: 'Policy Number',       value: policyNumber },
        { label: 'Coverage',            value: lossType },
        { label: 'Policy Limit',        value: '$500,000' },
        { label: 'Deductible',          value: '$25,000' },
        { label: 'Coverage Decision',   value: 'Covered', highlight: 'green' as const },
        { label: 'Evidence Source',     value: 'PolicyCenter' },
        { label: 'Verification Status', value: 'Verified', highlight: 'green' as const },
      ],
    },
    {
      key: 'documentation',
      title: 'Documentation Package',
      rows: [
        { label: 'Executive Summary',      value: `${lossType} loss sustained at ${claimantName}. Coverage confirmed. Reserve recommended at $${reserve.toLocaleString()}.` },
        { label: 'Date of Loss',           value: dateOfLoss },
        { label: 'Claim Notes',            value: 'Initial assessment complete. Structural inspection recommended.' },
        { label: 'Reserve Recommendation', value: `$${reserve.toLocaleString()}`, highlight: 'blue' as const },
        { label: 'Inspection Rec.',        value: 'Independent adjuster site visit required' },
        { label: 'Email Draft',            value: 'Adjuster notification drafted — pending send approval', highlight: 'amber' as const },
        { label: 'Adjuster Notes',         value: 'All documentation aligned with policy terms and loss details.' },
      ],
    },
    {
      key: 'investigation',
      title: 'Investigation & Evaluation',
      rows: [
        { label: 'Assessment',             value: `Damage consistent with reported ${lossType} event` },
        { label: 'Potential Exposure',     value: `$${reserve.toLocaleString()}`, highlight: 'blue' as const },
        { label: 'Specialist Rec.',        value: 'Structural engineer inspection recommended' },
        { label: 'Comparable Losses',      value: '3 comparable losses analyzed — within expected range' },
        { label: 'Reasoning Summary',      value: 'Loss causation confirmed. Coverage applies under policy terms. No exclusions identified.' },
      ],
    },
    {
      key: 'enrichment',
      title: 'Autonomous Enrichment',
      rows: [
        { label: 'Fraud Indicators',   value: 'None detected', highlight: 'green' as const },
        { label: 'CAT Detection',      value: `CAT event confirmed — ${lossType} regional event`, highlight: 'amber' as const },
        { label: 'Risk Signals',       value: sla <= 5 ? `SLA at risk — ${sla} days remaining` : `SLA healthy — ${sla} days remaining`, highlight: sla <= 5 ? 'amber' as const : 'green' as const },
        { label: 'External Data',      value: 'NOAA weather data corroborated. CAT designation applied.' },
        { label: 'Confidence Score',   value: '94%', highlight: 'green' as const },
      ],
    },
    {
      key: 'workflow',
      title: 'Workflow Coordination',
      rows: [
        { label: 'Notifications',         value: 'Assignment email drafted — awaiting adjuster approval' },
        { label: 'Specialist Engagement', value: 'Independent adjuster notified — site visit scheduled' },
        { label: 'SLA Events',            value: `${sla} days remaining — SLA alert configured` },
        { label: 'Workflow Actions',       value: 'Claim file updated · Reserve adjusted · Documentation staged' },
        { label: 'Future Tasks',          value: 'Reserve review in 72 hours · Inspection report due in 5 days' },
      ],
    },
    {
      key: 'governance',
      title: 'Governance Evidence',
      rows: [
        { label: 'Runtime ID',            value: workflowRun ? workflowRun.runId.slice(0, 12) + '…' : 'qarl-run-mock-001' },
        { label: 'Supervisor',            value: 'LangGraph Supervisor v2' },
        { label: 'Capabilities Executed', value: workflowRun ? `${workflowRun.capabilitiesExecuted}` : '5', highlight: 'green' as const },
        { label: 'Execution Time',        value: workflowRun ? `${(workflowRun.executionTimeMs / 1000).toFixed(1)}s` : '7.2s' },
        { label: 'Prompt Version',        value: 'qarl-v2.4.1' },
        { label: 'Evidence Sources',      value: 'PolicyCenter · ClaimCenter · EDW · NOAA' },
        { label: 'Audit Events',          value: workflowRun ? `${workflowRun.auditTraceCount} recorded` : '14 recorded', highlight: 'green' as const },
        { label: 'Enterprise Connectors', value: '5 mock contracts active' },
        { label: 'Approval Required',     value: 'YES', highlight: 'amber' as const },
      ],
    },
  ];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2.5 border-b border-slate-100"
        style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div
          className="rounded-lg flex items-center justify-center shrink-0"
          style={{ width: 26, height: 26, background: BLUE }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1.5" y="1" width="9" height="10" rx="1.5" stroke="white" strokeWidth="1.1"/>
            <path d="M3.5 4.5h5M3.5 6.5h5M3.5 8.5h3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>
            Governed Claim Package
          </p>
          <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
            {isAutonomousMode ? 'AI-assembled package — expand each section to review before approving' : 'AI-assembled package pending adjuster approval'}
          </p>
        </div>
        {isComplete && approvalState && (
          <span
            className="font-black rounded-full border shrink-0"
            style={{
              fontSize: 8, letterSpacing: '0.09em', padding: '3px 10px',
              color: approvalState === 'approved' ? '#059669' : approvalState === 'rejected' ? '#dc2626' : approvalState === 'returned' ? '#b45309' : '#b45309',
              background: approvalState === 'approved' ? '#f0fdf4' : approvalState === 'rejected' ? '#fef2f2' : '#fffbeb',
              borderColor: approvalState === 'approved' ? '#bbf7d0' : approvalState === 'rejected' ? '#fecaca' : '#fde68a',
            }}
          >
            {approvalState === 'approved' ? 'APPROVED' : approvalState === 'rejected' ? 'REJECTED' : approvalState === 'returned' ? 'RETURNED' : approvalState === 'approving' ? 'COMMITTING…' : 'AWAITING REVIEW'}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '14px 20px 0' }}>
        {!isComplete ? (
          <p className="text-slate-400 font-medium pb-4" style={{ fontSize: 11 }}>Assembling governed package…</p>
        ) : isAutonomousMode ? (
          /* ── Autonomous mode: expandable review sections ── */
          <div>
            {/* Governance message */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 flex items-center gap-3 mb-4" style={{ padding: '8px 12px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <circle cx="7" cy="7" r="5.5" stroke={BLUE} strokeWidth="1.3"/>
                <path d="M7 4.5v3.5" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.7" fill={BLUE}/>
              </svg>
              <p className="font-semibold text-[#1976d2] leading-snug" style={{ fontSize: 9.5 }}>
                <span className="font-black">AI assembles · Human reviews · Human approves · Enterprise Runtime commits</span>
              </p>
            </div>

            {/* Expandable sections */}
            <div className="space-y-2 mb-4">
              {sections.map(section => (
                <ReviewSection
                  key={section.key}
                  title={section.title}
                  rows={section.rows}
                  expanded={expandedSections.has(section.key)}
                  onToggle={() => toggleSection(section.key)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ── Manual mode: compact package status ── */
          <div className="pb-4">
            <p className="font-black text-[#0f3460] mb-1" style={{ fontSize: 13 }}>
              Governed Claim Package Ready
            </p>
            <p className="font-medium text-slate-500 mb-0.5" style={{ fontSize: 11 }}>
              5 capability outputs assembled
            </p>
            <p className="font-medium text-slate-400" style={{ fontSize: 11 }}>
              Awaiting documentation review
            </p>
          </div>
        )}
      </div>

      {/* ── Autonomous mode: Human Approval Gate at bottom ── */}
      {isComplete && isAutonomousMode && approvalState && (
        <div className="border-t border-slate-100" style={{ padding: '0 20px 20px' }}>
          <HumanApprovalGate
            approvalState={approvalState}
            approvalCommitStep={approvalCommitStep ?? 0}
            onApprove={onApprove ?? (() => {})}
            onRequestChanges={onRequestChanges ?? (() => {})}
            onReject={onReject ?? (() => {})}
            onResubmit={onResubmit ?? (() => {})}
            onRevisePackage={onRevisePackage ?? (() => {})}
          />
        </div>
      )}

      {/* ── Manual mode: bottom status line ── */}
      {isComplete && !isAutonomousMode && (
        <div className="border-t border-slate-100" style={{ padding: '8px 20px' }}>
          {(() => {
            const { text, color } = packageStatusLabel(workflowStage ?? 'DOCUMENTATION_REVIEW');
            return (
              <p className="font-semibold text-slate-500" style={{ fontSize: 10 }}>
                Package Status:{' '}
                <span className="font-black" style={{ color }}>{text}</span>
              </p>
            );
          })()}
          {workflowRun && (
            <p className="font-medium text-slate-400 mt-1" style={{ fontSize: 9 }}>
              Backend Run ID:{' '}
              <span className="font-mono text-slate-400" style={{ fontSize: 8 }}>{workflowRun.runId.slice(0, 8)}…</span>
              {' · '}
              <span className="text-slate-400">{workflowRun.auditTraceCount} audit events</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AI Runtime Execution panel
═══════════════════════════════════════════ */
function ArchitectureProofPanel({
  backendStatus: _backendStatus,
  workflowRun: _workflowRun,
  approvalState,
}: {
  backendStatus?: 'loading' | 'connected' | 'prototype' | null;
  workflowRun?: WorkflowRunResult | null;
  approvalState?: ApprovalState;
}) {
  const statusValue =
    approvalState === 'approved'  ? 'Approved'            :
    approvalState === 'approving' ? 'Committing…'         :
    approvalState === 'returned'  ? 'Changes Requested'   :
    approvalState === 'rejected'  ? 'Rejected'            :
    'Awaiting Approval';

  const statusColor =
    approvalState === 'approved'  ? '#059669' :
    approvalState === 'approving' ? BLUE       :
    approvalState === 'returned'  ? '#b45309' :
    approvalState === 'rejected'  ? '#dc2626' :
    '#b45309';

  const statusBg =
    approvalState === 'approved'  ? '#f0fdf4' :
    approvalState === 'approving' ? '#eff6ff' :
    approvalState === 'returned'  ? '#fffbeb' :
    approvalState === 'rejected'  ? '#fef2f2' :
    '#fffbeb';

  const statusBorder =
    approvalState === 'approved'  ? '#bbf7d0' :
    approvalState === 'approving' ? '#bfdbfe' :
    approvalState === 'returned'  ? '#fde68a' :
    approvalState === 'rejected'  ? '#fecaca' :
    '#fde68a';

  const summaryRows = [
    { label: 'Supervisor',                  value: 'LangGraph Supervisor', valueColor: NAVY,      valueBg: '#eff6ff', valueBorder: '#bfdbfe' },
    { label: 'Capabilities Executed',        value: '5',                   valueColor: '#059669', valueBg: '#f0fdf4', valueBorder: '#bbf7d0' },
    { label: 'Enterprise Systems Connected', value: '5',                   valueColor: '#059669', valueBg: '#f0fdf4', valueBorder: '#bbf7d0' },
    { label: 'Governance Review',            value: 'Required',            valueColor: '#b45309', valueBg: '#fffbeb', valueBorder: '#fde68a' },
    { label: 'Current Status',               value: statusValue,           valueColor: statusColor, valueBg: statusBg, valueBorder: statusBorder },
  ];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 border-b border-slate-100"
        style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}
      >
        <div
          className="rounded-lg flex items-center justify-center shrink-0"
          style={{ width: 26, height: 26, background: BLUE }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="2" r="1.4" stroke="white" strokeWidth="1.1"/>
            <circle cx="2"   cy="11" r="1.4" stroke="white" strokeWidth="1.1"/>
            <circle cx="11"  cy="11" r="1.4" stroke="white" strokeWidth="1.1"/>
            <path d="M6.5 3.4V7.5M6.5 7.5L2 9.6M6.5 7.5L11 9.6" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>
            AI Runtime Execution
          </p>
          <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
            Execution Summary
          </p>
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: '12px 20px 14px' }}>
        <div className="space-y-2.5">
          {summaryRows.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-500 shrink-0" style={{ fontSize: 10 }}>
                {row.label}
              </span>
              <span
                className="font-bold rounded border shrink-0"
                style={{ fontSize: 9, letterSpacing: '0.04em', padding: '2px 7px', color: row.valueColor, background: row.valueBg, borderColor: row.valueBorder }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Manual elimination banner
═══════════════════════════════════════════ */
function ManualEliminationBanner({ isComplete, autonomousStep }: { isComplete: boolean; autonomousStep?: number }) {
  const isAutonomousMode = autonomousStep !== undefined;
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
            style={{
              width: 26, height: 26,
              background: 'linear-gradient(135deg, #1976d2 0%, #0f3460 100%)',
              boxShadow: '0 2px 5px rgba(25,118,210,0.28)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2"/>
              <path d="M3.5 6l1.5 1.5L8.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>
            Manual Tasks Automated
          </p>
        </div>
        <span
          className="font-bold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"
          style={{ fontSize: 8, letterSpacing: '0.10em', padding: '2px 10px' }}
        >
          AUTOMATED BY QARL
        </span>
      </div>

      <div className="flex items-center justify-around" style={{ padding: '18px 20px' }}>
        {MANUAL_TASKS.map((task, idx) => {
          const isEliminated = isAutonomousMode ? (autonomousStep ?? 0) > idx : isComplete;
          return (
            <div key={task.label} className="flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className="rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
                  style={{ width: 48, height: 48, opacity: 0.28 }}
                >
                  {task.icon}
                </div>
                <div
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 flex items-center justify-center"
                  style={{
                    width: 16, height: 16,
                    boxShadow: '0 1px 4px rgba(5,150,105,0.40)',
                    opacity: isEliminated ? 1 : 0.2,
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                    <path d="M1 3.5l1.5 1.5L6 1.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span
                className="font-semibold text-center leading-tight"
                style={{ fontSize: 9, color: '#374151', maxWidth: 72, opacity: isEliminated ? 1 : 0.4, transition: 'opacity 0.5s ease' }}
              >
                {task.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Enterprise Adapter Layer panel
═══════════════════════════════════════════ */

const ADAPTER_ROWS: {
  system: string;
  direction: string;
  dirType: 'read' | 'write' | 'draft' | 'publish';
  purpose: string;
}[] = [
  { system: 'PolicyCenter', direction: 'READ',                    dirType: 'read',    purpose: 'Coverage and policy verification'            },
  { system: 'ClaimCenter',  direction: 'READ / WRITE PENDING',    dirType: 'write',   purpose: 'Claim context and governed note write-back'  },
  { system: 'EDW',          direction: 'READ',                    dirType: 'read',    purpose: 'Comparable loss and fraud enrichment'         },
  { system: 'Outlook',      direction: 'DRAFT',                   dirType: 'draft',   purpose: 'Assignment email and adjuster notifications'  },
  { system: 'Event Bus',    direction: 'PUBLISH',                 dirType: 'publish', purpose: 'Governance audit event publication'           },
];

const TRACE_EVENTS: { system: string; event: string; warn?: boolean }[] = [
  { system: 'PolicyCenter', event: 'Coverage eligibility confirmed'                               },
  { system: 'ClaimCenter',  event: 'Claim file reviewed and context extracted'                    },
  { system: 'EDW',          event: 'Comparable losses and risk signals analyzed'                  },
  { system: 'Outlook',      event: 'Assignment email drafted — awaiting send approval'            },
  { system: 'ClaimCenter',  event: 'Claim note prepared — awaiting adjuster approval', warn: true },
  { system: 'Event Bus',    event: 'Governance audit trail recorded'                              },
];

/* Latest 3 meaningful events shown in the trace preview (pre-approval state).
   Derived from TRACE_EVENTS so underlying data is preserved and referenced. */
const TRACE_PREVIEW = [TRACE_EVENTS[4], TRACE_EVENTS[3], TRACE_EVENTS[5]];

const DIR_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  read:    { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  write:   { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  draft:   { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
  publish: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

function EnterpriseAdapterLayerPanel({
  backendStatus,
  workflowRun,
  approvalState,
}: {
  backendStatus?: 'loading' | 'connected' | 'prototype' | null;
  workflowRun?: WorkflowRunResult | null;
  approvalState?: ApprovalState;
}) {
  const isConnected = backendStatus === 'connected';
  const isApproved  = approvalState === 'approved';
  const isRejected  = approvalState === 'rejected';
  const isReturned  = approvalState === 'returned';

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
            {/* Plug/connector icon */}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="4" y="1" width="2" height="3" rx="0.5" stroke="white" strokeWidth="1.1"/>
              <rect x="7" y="1" width="2" height="3" rx="0.5" stroke="white" strokeWidth="1.1"/>
              <path d="M2.5 4h8v2a4 4 0 01-8 0V4z" stroke="white" strokeWidth="1.1" strokeLinejoin="round"/>
              <line x1="6.5" y1="8" x2="6.5" y2="12" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 12 }}>
              Enterprise Actions Executed
            </p>
            <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 9 }}>
              AI-initiated enterprise actions — all outcomes pending human approval
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

        {/* ── Left: adapter contract table ── */}
        <div style={{ padding: '14px 20px 16px' }}>
          <p className="font-black text-slate-400 uppercase mb-3" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
            Adapter Contracts
          </p>
          <div className="space-y-2">
            {ADAPTER_ROWS.map(row => {
              const ds = DIR_STYLE[row.dirType];
              return (
                <div key={row.system} className="flex items-center gap-3">
                  {/* System name */}
                  <span
                    className="font-black text-[#0f3460] shrink-0"
                    style={{ fontSize: 10, minWidth: 80 }}
                  >
                    {row.system}
                  </span>
                  {/* Direction badge */}
                  <span
                    className="font-bold rounded border shrink-0 uppercase"
                    style={{ fontSize: 7.5, letterSpacing: '0.06em', padding: '2px 6px', color: ds.color, background: ds.bg, borderColor: ds.border }}
                  >
                    {row.direction}
                  </span>
                  {/* Mock active badge */}
                  <span
                    className="font-bold rounded border shrink-0"
                    style={{ fontSize: 7.5, letterSpacing: '0.06em', padding: '2px 6px', color: '#059669', background: '#f0fdf4', borderColor: '#bbf7d0' }}
                  >
                    MOCK ACTIVE
                  </span>
                  {/* Purpose */}
                  <span className="font-medium text-slate-400 truncate" style={{ fontSize: 9 }}>
                    {row.purpose}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Phase 3 note */}
          <div
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50"
            style={{ padding: '8px 12px' }}
          >
            <p className="font-medium text-slate-500 leading-snug" style={{ fontSize: 9.5 }}>
              Mock contracts are active today. Phase 3 replaces these contracts with production enterprise adapters without changing the user workflow.
            </p>
          </div>
        </div>

        {/* ── Right: runtime trace preview ── */}
        <div style={{ padding: '14px 20px 16px' }}>
          <p className="font-black text-slate-400 uppercase mb-3" style={{ fontSize: 8, letterSpacing: '0.14em' }}>
            Runtime Trace Preview
          </p>
          <div className="space-y-1.5">
            {(isApproved ? [
              { system: 'PolicyCenter', event: 'Coverage eligibility confirmed' },
              { system: 'ClaimCenter',  event: 'Claim file written to system of record' },
              { system: 'EDW',          event: 'Comparable losses and risk signals analyzed' },
              { system: 'Outlook',      event: 'Adjuster notification sent' },
              { system: 'ClaimCenter',  event: 'Claim note committed to ClaimCenter' },
              { system: 'Event Bus',    event: 'Governance audit trail published' },
            ] : isRejected || isReturned ? [
              { system: 'PolicyCenter', event: 'Coverage eligibility confirmed' },
              { system: 'ClaimCenter',  event: 'Claim file reviewed — no write (not approved)', warn: true },
              { system: 'EDW',          event: 'Comparable losses and risk signals analyzed' },
              { system: 'Outlook',      event: 'Notification draft discarded — not approved', warn: true },
              { system: 'ClaimCenter',  event: isReturned ? 'Package returned for revision' : 'Package rejected — execution closed', warn: true },
              { system: 'Event Bus',    event: 'Governance audit trail recorded' },
            ] : TRACE_PREVIEW).map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg"
                style={{
                  padding: '5px 9px',
                  background: (ev as { warn?: boolean }).warn ? '#fffbeb' : isApproved ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${(ev as { warn?: boolean }).warn ? '#fde68a' : isApproved ? '#bbf7d0' : '#e2e8f0'}`,
                  opacity: isConnected ? 1 : 0.65,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {/* Status icon */}
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14, background: (ev as { warn?: boolean }).warn ? '#fef3c7' : isApproved ? '#d1fae5' : '#dbeafe', border: `1px solid ${(ev as { warn?: boolean }).warn ? '#fde68a' : isApproved ? '#6ee7b7' : '#bfdbfe'}` }}
                >
                  {(ev as { warn?: boolean }).warn ? (
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
                {/* System chip */}
                <span
                  className="font-black shrink-0 rounded"
                  style={{ fontSize: 8, letterSpacing: '0.04em', padding: '1px 5px', color: '#475569', background: '#e2e8f0' }}
                >
                  {ev.system}
                </span>
                {/* Event text */}
                <span
                  className="font-medium leading-none"
                  style={{ fontSize: 9.5, color: (ev as { warn?: boolean }).warn ? '#92400e' : isApproved ? '#059669' : '#374151' }}
                >
                  {ev.event}
                </span>
              </div>
            ))}
          </div>

          {/* View full trace — display only, shown in pre-approval state */}
          {!isApproved && !isRejected && !isReturned && (
            <div className="mt-2">
              <span
                className="font-semibold text-[#1976d2]"
                style={{ fontSize: 9.5, cursor: 'default', opacity: 0.75 }}
              >
                View Full Trace →
              </span>
            </div>
          )}

          {/* Connection state note */}
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

/* ═══════════════════════════════════════════
   Completion banner
═══════════════════════════════════════════ */
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
        {/* Icon */}
        <div
          className="rounded-2xl flex items-center justify-center shrink-0"
          style={{
            width: 56, height: 56,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.20)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="11" stroke="white" strokeWidth="1.6" opacity="0.5"/>
            <path d="M7 13l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Text */}
        <div>
          <p className="font-black text-white leading-tight" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>
            Post-FNOL Coverage Journey Complete
          </p>
          <div className="flex items-center gap-5 mt-2">
            {[
              '5 AI capabilities executed',
              '5 manual tasks eliminated',
              'Governed Claim Package — Awaiting Approval',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5L8.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-semibold text-blue-100" style={{ fontSize: 12 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onBack}
        className="font-black text-white rounded-2xl flex items-center gap-2.5 shrink-0 transition-all hover:opacity-90 active:scale-[0.97]"
        style={{
          fontSize: 13,
          padding: '14px 28px',
          whiteSpace: 'nowrap',
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

/* ═══════════════════════════════════════════
   Icon components
═══════════════════════════════════════════ */
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5.5" y="1" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 8a5.5 5.5 0 0011 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="8" y1="13.5" x2="8" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L2.5 4v4.5C2.5 11.5 5 14 8 14.5 11 14 13.5 11.5 13.5 8.5V4L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14L9 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9 2l1 2.5L12.5 5l-2.5 1L9 8.5 8 6 5.5 5l2.5-1L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2C8 2 12 4 12 9l-4 3-4-3c0-5 4-7 4-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 9.5L4 12.5M10.5 9.5L12 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="7" r="1" fill="currentColor"/>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="#94a3b8" strokeWidth="1.4"/>
      <path d="M7 7h6M7 10h6M7 13h4" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}


function KeyboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.4"/>
      <path d="M5 9h1M8 9h1M11 9h1M14 9h1M5 12h10" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 15V9a4 4 0 014-4h2a4 4 0 014 4v1" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="5" cy="15" r="2" stroke="#94a3b8" strokeWidth="1.4"/>
      <circle cx="15" cy="10" r="2" stroke="#94a3b8" strokeWidth="1.4"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="#94a3b8" strokeWidth="1.4"/>
      <path d="M2.5 7l7.5 5 7.5-5" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
