import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { Claim } from '../types';

/* ── Shared with App.tsx via structural typing ── */
interface DocumentationPackage {
  participants: string[];
  assessment: string[];
  recommendation: string;
  confidence: number;
  reserveAmount: number;
  enrichment?: EnrichmentPackage;
}

export interface EnrichmentPackage {
  confidence: number;
  result: string;
  type: string;
  rom: string;
}

interface Props {
  claim: Claim;
  onBack: () => void;
  onEnrichmentAdded: (enrichment: EnrichmentPackage) => void;
  onNavigateToDocumentation: () => void;
  docPackage?: DocumentationPackage | null;
  initialEnrichmentRun: boolean;
  initialEnrichmentAdded: boolean;
  onEnrichmentRun: () => void;
}

/* ── Design tokens ── */
const BLUE        = '#1976d2';
const NAVY        = '#0f3460';
const EASE        = 'cubic-bezier(0.4,0,0.2,1)';
const CARD_SHADOW = '0 1px 3px rgba(15,52,96,0.06), 0 4px 16px rgba(15,52,96,0.07)';

/* ── Per-card metadata ── */
const CARD_CONFIDENCE = [99, 97, 93, 95, 98, 91];
const CARD_EXEC_TIMES = ['348 ms', '421 ms', '512 ms', '389 ms', '472 ms', '634 ms'];
const CARD_TIMESTAMPS = ['09:14:01', '09:14:02', '09:14:03', '09:14:04', '09:14:05', '09:14:06'];

/* ── Activity log entries ── */
const ACTIVITY_LOG = [
  { time: '09:14:01', text: 'Weather service queried' },
  { time: '09:14:02', text: 'Historical claims retrieved' },
  { time: '09:14:03', text: 'Fraud indicators evaluated' },
  { time: '09:14:04', text: 'Exposure profile calculated' },
  { time: '09:14:05', text: 'Comparable benchmark matched' },
  { time: '09:14:06', text: 'Payment recommendation generated' },
  { time: '09:14:07', text: 'Documentation package updated' },
];

/* ── Progressive insight items ── */
const RUNNING_INSIGHTS = [
  'Weather event verified',
  'No prior claim conflicts',
  'Fraud score: Low',
  'Exposure profile enriched',
  'Benchmark matched',
];
const FINAL_INSIGHTS = [
  'Claim profile enriched',
  'No fraud determined',
  'Measure of loss generated',
  'Reserve benchmark supported',
  'Payment recommendation prepared',
  'Documentation package updated',
];

/* ── AI Reasoning line type ── */
type ReasonLine = { label: string; value?: string };

/* ── Enrichment card definition ── */
interface EnrichCard {
  id: string;
  title: string;
  status: string;
  finding: string;
  signal: string;
  signalColor: 'green' | 'amber' | 'blue';
  icon: ReactNode;
  evidence: string[];
  reasoning: ReasonLine[]; /* always 4 lines — ensures equal card height */
}

function buildCards(claim: Claim): EnrichCard[] {
  return [
    {
      id: 'weather',
      title: 'Weather Correlation',
      status: 'Verified',
      finding: `NOAA-confirmed severe wind event aligned with reported date of loss on ${claim.dateOfLoss}.`,
      signal: 'Strong',
      signalColor: 'green',
      icon: <WeatherIcon />,
      evidence: ['NOAA Weather API', 'Internal CAT Event Feed', 'FNOL Timestamp'],
      reasoning: [
        { label: 'NOAA severe wind event confirmed' },
        { label: 'Loss timestamp aligned' },
        { label: 'Distance', value: '4 miles' },
        { label: 'Correlation confidence', value: '99%' },
      ],
    },
    {
      id: 'prior-claims',
      title: 'Prior Claims Review',
      status: 'Reviewed',
      finding: 'No conflicting prior claim pattern identified. Policy history clean.',
      signal: 'Low Risk',
      signalColor: 'green',
      icon: <ClaimsIcon />,
      evidence: ['ClaimCenter History', 'Enterprise Data Warehouse', 'Policy History'],
      reasoning: [
        { label: 'No conflicting prior claims identified' },
        { label: 'No SIU referral history' },
        { label: 'Policy tenure', value: '7 years' },
        { label: 'Prior claim count', value: '1 (unrelated)' },
      ],
    },
    {
      id: 'fraud',
      title: 'Fraud Indicator Score',
      status: 'Evaluated',
      finding: 'No fraud indicators detected across all SIU rules and risk model outputs.',
      signal: 'Low',
      signalColor: 'green',
      icon: <FraudIcon />,
      evidence: ['SIU Rules Engine', 'Fraud Risk Model', 'Third-party Fraud Dataset'],
      reasoning: [
        { label: 'No suspicious payment pattern' },
        { label: 'No prior SIU history' },
        { label: 'No address mismatch' },
        { label: 'Overall fraud risk', value: 'LOW' },
      ],
    },
    {
      id: 'property',
      title: 'Property / Exposure Profile',
      status: 'Enriched',
      finding: `Property exposure for ${claim.claimantName} supports reserve review. Coverage active.`,
      signal: 'Moderate',
      signalColor: 'amber',
      icon: <PropertyIcon />,
      evidence: ['Policy Schedule', 'GIS Property Data', 'Exposure Repository'],
      reasoning: [
        { label: 'Policy schedule reviewed' },
        { label: 'Exposure category', value: 'Wind / Hail' },
        { label: 'Property class', value: 'Residential' },
        { label: 'Coverage status', value: 'Active' },
      ],
    },
    {
      id: 'benchmark',
      title: 'Comparable Loss Benchmark',
      status: 'Matched',
      finding: `27 comparable ${claim.lossType.toLowerCase()} losses support revised reserve of $${claim.reserve.toLocaleString()}.`,
      signal: 'Strong',
      signalColor: 'green',
      icon: <BenchmarkIcon />,
      evidence: ['Historical Loss Dataset', 'Benchmark Analytics', 'Regional Windstorm Data'],
      reasoning: [
        { label: 'Comparable losses analyzed', value: '27' },
        { label: 'Median settlement', value: '$338,000' },
        { label: 'Recommended reserve', value: '$346,000' },
        { label: 'Deviation', value: '+2.3%' },
      ],
    },
    {
      id: 'payment',
      title: 'Payment Recommendation',
      status: 'Recommended',
      finding: 'Payment recommendation prepared and aligned with benchmark and reserve model outputs.',
      signal: 'Review Required',
      signalColor: 'amber',
      icon: <PaymentIcon />,
      evidence: ['Reserve Model', 'Benchmark Analysis', 'Coverage Verification'],
      reasoning: [
        { label: 'Reserve model aligned with benchmark' },
        { label: 'Coverage verification', value: 'Active' },
        { label: 'Recommended action', value: 'Proceed to payment' },
        { label: 'Adjuster approval required' },
      ],
    },
  ];
}

/* ═══════════════════════════════════════════
   Main page — routing, state and orchestration
   (props / state / navigation unchanged)
═══════════════════════════════════════════ */
export default function AutoEnrichmentsPage({
  claim, onBack, onEnrichmentAdded, onNavigateToDocumentation, docPackage,
  initialEnrichmentRun, initialEnrichmentAdded, onEnrichmentRun,
}: Props) {
  const [completedCount, setCompletedCount] = useState(initialEnrichmentRun ? 6 : 0);
  const [isRunning,      setIsRunning]      = useState(false);
  const [enriched,       setEnriched]       = useState(initialEnrichmentRun);
  const [pkgAdded,       setPkgAdded]       = useState(initialEnrichmentAdded);
  const [pkgSuccess,     setPkgSuccess]     = useState(initialEnrichmentAdded);

  const cards = buildCards(claim);
  const alreadyHasEnrichment = !!docPackage?.enrichment;

  /* Sequential orchestration — 450ms per card ≈ 2.8 sec total */
  const handleRunEnrichment = () => {
    if (enriched || isRunning) return;
    setIsRunning(true);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        setCompletedCount(i + 1);
        if (i === 5) { setIsRunning(false); setEnriched(true); onEnrichmentRun(); }
      }, (i + 1) * 450);
    }
  };

  /* Documentation package handoff — unchanged */
  const handleAddToPackage = () => {
    if (!enriched || pkgAdded || alreadyHasEnrichment) return;
    const pkg: EnrichmentPackage = {
      confidence: 97,
      result: 'No fraud determined. Recommendations for payment.',
      type: 'Measure of Loss',
      rom: 'Rough Order of Magnitude',
    };
    setPkgAdded(true);
    setPkgSuccess(true);
    onEnrichmentAdded(pkg);
  };

  const addDisabled = !enriched || pkgAdded || alreadyHasEnrichment;
  const addLabel    = alreadyHasEnrichment || pkgAdded
    ? 'Added ✓'
    : !enriched
    ? 'Run Enrichment first'
    : 'Add Enrichment to Documentation Package';

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#f1f5f9' }}>
      <PageHeader claim={claim} onBack={onBack} />

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ padding: '20px 32px', gap: 16 }}>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-5">

          <EnrichmentSummaryCard
            claim={claim}
            enriched={enriched}
            isRunning={isRunning}
            completedCount={completedCount}
          />

          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <EnrichmentCard
                key={card.id}
                card={card}
                index={i}
                completed={i < completedCount}
                processing={i === completedCount && isRunning}
              />
            ))}
          </div>

          {(isRunning || enriched) && (
            <ActivityLog completedCount={completedCount} isRunning={isRunning} />
          )}

          {/* Post-enrichment: announcement → findings → action */}
          {enriched && (
            <>
              <CompletionBanner />
              <AIRecommendationCard />
              <DocPackagePreview addDisabled={addDisabled} onAddToPackage={handleAddToPackage} />
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="shrink-0 overflow-y-auto" style={{ width: 248 }}>
          <InsightPanel completedCount={completedCount} enriched={enriched} isRunning={isRunning} />
          {(isRunning || enriched) && (
            <div className="mt-4">
              <GovernanceCard enriched={enriched} />
            </div>
          )}
        </div>
      </div>

      <ActionBar
        enriched={enriched}
        isRunning={isRunning}
        addDisabled={addDisabled}
        addLabel={addLabel}
        pkgSuccess={pkgSuccess}
        onRunEnrichment={handleRunEnrichment}
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
    <div className="shrink-0 border-b border-slate-200" style={{ background: '#fff', padding: '0 32px', boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
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
              AI Capability · Step 4 of 5
            </p>
            <h1 className="font-black leading-tight" style={{ fontSize: 22, color: NAVY, letterSpacing: '-0.02em' }}>
              Auto-Enrichments
            </h1>
            <p className="font-semibold text-slate-500 mt-1" style={{ fontSize: 12 }}>Claims Profile Enrichment</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-semibold text-slate-500" style={{ fontSize: 12 }}>{claim.claimantName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-slate-400" style={{ fontSize: 11 }}>{claim.id}</span>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-500" style={{ fontSize: 12 }}>{claim.lossType}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Pill label="Claim Scoped" bg="#f8fafc" text="#475569" border="#e2e8f0" />
            <Pill label="AI Enriched"  bg="#eff6ff" text="#1d4ed8" border="#bfdbfe" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, bg, text, border }: { label: string; bg: string; text: string; border: string }) {
  return (
    <span className="font-black rounded-full border uppercase" style={{ fontSize: 9, letterSpacing: '0.10em', padding: '3px 12px', background: bg, color: text, borderColor: border }}>
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════
   QARL Enrichment Summary — always 5 KPI cells (no layout shift)
═══════════════════════════════════════════ */
function EnrichmentSummaryCard({
  claim, enriched, isRunning, completedCount,
}: { claim: Claim; enriched: boolean; isRunning: boolean; completedCount: number }) {

  const statusColor = enriched ? '#059669' : isRunning ? BLUE : '#b45309';
  const statusLabel = enriched ? 'Enrichment Complete' : isRunning ? 'Processing…' : 'Ready to Enrich';
  const statusBg    = enriched ? '#f0fdf4' : isRunning ? '#eff6ff' : '#fffbeb';
  const statusBdr   = enriched ? '#bbf7d0' : isRunning ? '#bfdbfe' : '#fde68a';

  const execTime = enriched
    ? '2.8 sec'
    : completedCount > 0
    ? `${(completedCount * 0.45 + 0.1).toFixed(1)} sec`
    : '—';

  /* Always 5 cells — prevents layout shift when orchestration starts */
  const kpis = [
    { label: 'Signals Analyzed',  value: completedCount > 0 ? `${completedCount} / 6` : '—' },
    { label: 'Evidence Sources',  value: completedCount > 0 ? `${completedCount * 3}` : '—' },
    { label: 'Models Invoked',    value: completedCount > 0 ? `${Math.min(completedCount + 1, 4)}` : '—' },
    { label: 'Execution Time',    value: execTime },
    { label: 'Overall Confidence', value: enriched ? '97%' : '—' },
  ];

  const barWidth = enriched ? '97%' : completedCount > 0 ? `${completedCount * 14}%` : '0%';

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden"
      style={{
        boxShadow: enriched ? `${CARD_SHADOW}, 0 0 0 1.5px rgba(5,150,105,0.12)` : CARD_SHADOW,
        borderColor: enriched ? '#bbf7d0' : '#e2e8f0',
        transition: `border-color 0.4s ${EASE}, box-shadow 0.4s ${EASE}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b"
        style={{
          padding: '14px 24px',
          background: enriched ? 'rgba(240,253,244,0.7)' : 'rgba(248,250,252,0.9)',
          borderColor: enriched ? '#bbf7d0' : '#f1f5f9',
          transition: `background 0.4s ${EASE}`,
        }}
      >
        <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`, boxShadow: '0 2px 6px rgba(25,118,210,0.28)' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.3"/>
            <path d="M4 6.5l1.5 1.5L9 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 13 }}>QARL Enrichment Summary</p>
          <p className="font-medium text-slate-400 leading-none mt-0.5" style={{ fontSize: 11 }}>
            Claims Profile · {claim.claimantName} · {claim.id}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isRunning && (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke={BLUE} strokeWidth="1.6" strokeDasharray="22 10"/>
            </svg>
          )}
          <span
            className="font-black rounded-full border uppercase"
            style={{ fontSize: 8, letterSpacing: '0.10em', padding: '3px 12px', background: statusBg, color: statusColor, borderColor: statusBdr, transition: `all 0.4s ${EASE}` }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* KPI row — fixed 5 cells, no layout shift */}
      <div className="flex items-stretch divide-x divide-slate-100" style={{ padding: '16px 24px' }}>
        {kpis.map((item, i) => (
          <div key={item.label} className={`flex-1 min-w-0 ${i > 0 ? 'pl-5' : ''} ${i < kpis.length - 1 ? 'pr-5' : ''}`}>
            <p className="font-black text-slate-400 uppercase mb-1.5" style={{ fontSize: 8, letterSpacing: '0.13em' }}>{item.label}</p>
            <p className="font-semibold leading-none" style={{ fontSize: 13, color: NAVY }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div className="border-t border-slate-100" style={{ padding: '11px 24px 15px' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.13em' }}>Overall Confidence</p>
          <span className="font-black text-[#0f3460]" style={{ fontSize: 13 }}>97%</span>
        </div>
        <div className="rounded-full bg-slate-100 overflow-hidden" style={{ height: 5 }}>
          <div
            className="rounded-full h-full"
            style={{ width: barWidth, background: `linear-gradient(to right, ${BLUE}, ${NAVY})`, transition: `width 0.65s ${EASE}` }}
          />
        </div>
        <p className="font-medium text-slate-400 mt-1.5" style={{ fontSize: 10 }}>
          {enriched
            ? 'AI verified · Enrichment complete · 18 evidence sources'
            : completedCount > 0
            ? `Analyzing… ${completedCount} of 6 signals complete`
            : 'Pending enrichment'}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Individual enrichment card
   — normalized to 4 reasoning lines for equal heights
═══════════════════════════════════════════ */
function EnrichmentCard({ card, index, completed, processing }: {
  card: EnrichCard; index: number; completed: boolean; processing: boolean;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const signal = {
    green: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
    amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
    blue:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: BLUE },
  }[card.signalColor];

  const borderColor  = processing ? BLUE : completed ? '#d1fae5' : '#e2e8f0';
  const boxShadow    = processing
    ? `${CARD_SHADOW}, 0 0 0 2px rgba(25,118,210,0.20), 0 6px 24px rgba(25,118,210,0.14)`
    : completed
    ? `${CARD_SHADOW}, 0 0 0 1px rgba(5,150,105,0.08)`
    : CARD_SHADOW;
  const headerBg     = processing ? 'rgba(239,246,255,0.85)' : completed ? 'rgba(240,253,244,0.55)' : 'rgba(248,250,252,0.9)';
  const headerBorder = processing ? '#bfdbfe' : completed ? '#d1fae5' : '#f1f5f9';
  const statusLabel  = processing ? 'Analyzing…' : completed ? card.status : 'Pending';
  const statusStyle  = processing
    ? { bg: '#eff6ff', text: BLUE,      border: '#bfdbfe' }
    : completed
    ? { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
    : { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };

  const TRANS = `0.35s ${EASE}`;

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden flex flex-col"
      style={{ boxShadow, borderColor, transition: `border-color ${TRANS}, box-shadow ${TRANS}` }}
    >
      {/* ── Header — 48px fixed height ── */}
      <div
        className="flex items-center gap-2.5 border-b shrink-0"
        style={{ padding: '11px 14px', minHeight: 48, background: headerBg, borderColor: headerBorder, transition: `background ${TRANS}, border-color ${TRANS}` }}
      >
        <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}>
          {card.icon}
        </div>
        <p className="font-black text-[#0f3460] flex-1 leading-tight" style={{ fontSize: 11 }}>{card.title}</p>
        {processing ? (
          <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke={BLUE} strokeWidth="1.6" strokeDasharray="22 10"/>
          </svg>
        ) : (
          <span
            className="font-black rounded-full border uppercase shrink-0"
            style={{ fontSize: 7, letterSpacing: '0.08em', padding: '2px 8px', background: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border, transition: `all ${TRANS}` }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* ── Finding — fixed min-height for row alignment ── */}
      <div style={{ padding: '11px 14px 0', minHeight: 44 }}>
        <p
          className="font-medium text-slate-600 leading-snug"
          style={{ fontSize: 11.5, opacity: completed ? 1 : processing ? 0.65 : 0.35, transition: `opacity 0.4s ${EASE}` }}
        >
          {card.finding}
        </p>
      </div>

      {/* ── AI Reasoning — exactly 4 lines, consistent label ── */}
      {completed && (
        <div style={{ padding: '10px 14px 0' }}>
          <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 8, letterSpacing: '0.12em' }}>
            AI Reasoning
          </p>
          <div className="space-y-1.5">
            {card.reasoning.map((line, i) => (
              line.value ? (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-500 leading-none" style={{ fontSize: 10.5 }}>{line.label}</span>
                  <span className="font-black text-[#0f3460] leading-none shrink-0" style={{ fontSize: 10.5 }}>{line.value}</span>
                </div>
              ) : (
                <div key={i} className="flex items-center gap-2">
                  <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 13, height: 13, background: '#dcfce7' }}>
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-medium text-slate-600 leading-none" style={{ fontSize: 10.5 }}>{line.label}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence Used — collapsible with divider, hover state ── */}
      {completed && (
        <div style={{ padding: '8px 14px 0', marginTop: 6, borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setEvidenceOpen(v => !v)}
            className="w-full flex items-center justify-between rounded-lg transition-colors group"
            style={{ padding: '4px 0' }}
          >
            <span
              className="font-black text-slate-400 group-hover:text-[#1976d2] uppercase transition-colors"
              style={{ fontSize: 7.5, letterSpacing: '0.12em' }}
            >
              Evidence Used
            </span>
            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#1976d2] transition-colors">
              <span className="font-medium" style={{ fontSize: 9.5 }}>3 sources</span>
              <svg
                width="9" height="9" viewBox="0 0 9 9" fill="none"
                style={{ transform: evidenceOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 0.25s ${EASE}` }}
              >
                <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
          <div style={{ maxHeight: evidenceOpen ? 100 : 0, overflow: 'hidden', transition: `max-height 0.28s ${EASE}` }}>
            <div className="space-y-1.5" style={{ paddingTop: 8, paddingBottom: 2, borderTop: '1px solid #f8fafc', marginTop: 4 }}>
              {card.evidence.map(src => (
                <div key={src} className="flex items-center gap-1.5">
                  <div className="rounded flex items-center justify-center shrink-0" style={{ width: 13, height: 13, background: '#eff6ff' }}>
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-medium text-slate-500" style={{ fontSize: 10.5 }}>{src}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer — signal + confidence + exec box ── */}
      <div style={{ padding: '10px 14px 12px', marginTop: 'auto' }}>
        {/* Signal row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-400 uppercase" style={{ fontSize: 7, letterSpacing: '0.12em' }}>Signal</span>
            <span className="rounded-full shrink-0" style={{ width: 5, height: 5, background: completed ? signal.dot : '#cbd5e1', transition: `background 0.4s ${EASE}` }} />
            <span
              className="font-bold rounded-full border"
              style={{
                fontSize: 7, letterSpacing: '0.06em', padding: '1px 7px',
                background: completed ? signal.bg : '#f8fafc',
                color: completed ? signal.text : '#94a3b8',
                borderColor: completed ? signal.border : '#e2e8f0',
                transition: `all 0.4s ${EASE}`,
              }}
            >
              {completed ? card.signal : '—'}
            </span>
          </div>
          {completed && (
            <div className="flex items-center gap-1.5">
              <span className="font-black text-emerald-600" style={{ fontSize: 11 }}>{CARD_CONFIDENCE[index]}%</span>
              <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l1.5 1.5L6.5 2" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Exec metrics box */}
        {completed && (
          <div className="rounded-lg flex items-center justify-between" style={{ padding: '5px 9px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div>
              <p className="font-black text-slate-400 uppercase" style={{ fontSize: 6.5, letterSpacing: '0.12em' }}>Execution Time</p>
              <p className="font-black text-[#0f3460]" style={{ fontSize: 11 }}>{CARD_EXEC_TIMES[index]}</p>
            </div>
            <div className="w-px bg-slate-200 self-stretch mx-1" />
            <div className="text-right">
              <p className="font-black text-slate-400 uppercase" style={{ fontSize: 6.5, letterSpacing: '0.12em' }}>Completed</p>
              <p className="font-mono text-slate-500" style={{ fontSize: 10 }}>{CARD_TIMESTAMPS[index]}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Live orchestration timeline
═══════════════════════════════════════════ */
function ActivityLog({ completedCount, isRunning }: { completedCount: number; isRunning: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [completedCount]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100" style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.9)' }}>
        <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 24, height: 24, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="white" strokeWidth="1.1"/>
            <path d="M5.5 3.5v2l1.5 1.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="font-black text-[#0f3460]" style={{ fontSize: 12 }}>QARL Orchestration Timeline</p>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={`rounded-full shrink-0${isRunning ? ' animate-pulse' : ''}`}
            style={{ width: 6, height: 6, background: isRunning ? '#22c55e' : '#059669' }}
          />
          <span
            className="font-black uppercase rounded-full border"
            style={{ fontSize: 7, letterSpacing: '0.10em', padding: '2px 8px', background: isRunning ? '#eff6ff' : '#f0fdf4', color: isRunning ? BLUE : '#059669', borderColor: isRunning ? '#bfdbfe' : '#bbf7d0' }}
          >
            {isRunning ? 'LIVE' : 'Completed'}
          </span>
        </div>
      </div>

      {/* Scrollable entries */}
      <div ref={scrollRef} style={{ padding: '10px 20px 14px', maxHeight: 200, overflowY: 'auto' }}>
        <div className="space-y-0.5">
          {ACTIVITY_LOG.map((entry, i) => {
            const isVisible = i < 6 ? completedCount > i : completedCount >= 6;
            const isNewest  = isRunning && isVisible && i === completedCount - 1;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg"
                style={{
                  padding: '5px 9px', margin: '0 -9px',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
                  background: isNewest ? 'rgba(25,118,210,0.07)' : 'transparent',
                  /* background fades smoothly when `isNewest` becomes false */
                  transition: `opacity 0.3s ${EASE}, transform 0.3s ${EASE}, background 0.6s ${EASE}`,
                }}
              >
                <span className="font-mono text-slate-400 shrink-0 tabular-nums" style={{ fontSize: 10 }}>{entry.time}</span>
                <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0" style={{ width: 14, height: 14 }}>
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                    <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-slate-700 flex-1" style={{ fontSize: 11 }}>{entry.text}</span>
                {isNewest && (
                  <span className="font-black rounded-full" style={{ fontSize: 7, padding: '1px 7px', background: '#eff6ff', color: BLUE, letterSpacing: '0.08em' }}>
                    NOW
                  </span>
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
   Completion banner — announcement anchor
═══════════════════════════════════════════ */
function CompletionBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
        boxShadow: '0 4px 20px rgba(25,118,210,0.30)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.45s ${EASE}, transform 0.45s ${EASE}`,
      }}
    >
      {/* Title row */}
      <div className="flex items-center gap-3" style={{ padding: '15px 22px 11px' }}>
        <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.18)' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="white" strokeWidth="1.4"/>
            <path d="M4 7.5l2.5 2.5L11 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="font-black text-white leading-none" style={{ fontSize: 14 }}>QARL Auto-Enrichment Complete</p>
        <span
          className="ml-auto font-black rounded-full border uppercase"
          style={{ fontSize: 7, letterSpacing: '0.12em', padding: '2px 10px', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.20)' }}
        >
          AI Verified
        </span>
      </div>

      {/* Bullet summary */}
      <div className="flex items-center gap-5 flex-wrap" style={{ padding: '0 22px 14px' }}>
        {[
          '6 enrichment signals processed',
          'No fraud indicators',
          'Reserve benchmark validated',
          '18 evidence sources verified',
          'Documentation package enriched',
        ].map(item => (
          <div key={item} className="flex items-center gap-2">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium" style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Governance footer */}
      <div className="flex items-center gap-3" style={{ padding: '9px 22px 13px', borderTop: '1px solid rgba(255,255,255,0.14)' }}>
        <span className="font-semibold" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          Awaiting adjuster review · Not written to ClaimCenter
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: '#fbbf24' }} />
          <span className="font-semibold" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
            Human review required before write
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   QARL AI Recommendation card
═══════════════════════════════════════════ */
function AIRecommendationCard() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, []);

  const items = [
    'Weather correlation confirms the reported event.',
    'No fraud indicators were identified.',
    'Comparable benchmark analysis supports the revised reserve recommendation.',
    'Exposure analysis aligns with policy coverage.',
    'Payment recommendation has been prepared.',
    'The documentation package has been enriched with supporting evidence and is ready for adjuster review.',
  ];

  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.45s ${EASE}, transform 0.45s ${EASE}` }}>
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ boxShadow: `${CARD_SHADOW}, 0 0 0 1px rgba(5,150,105,0.10)`, borderColor: '#bbf7d0' }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-emerald-100" style={{ padding: '14px 20px', background: 'rgba(240,253,244,0.75)' }}>
          <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L11 4v4L6 11 1 8V4L6 1z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M4 6l1.5 1.5L8.5 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 14 }}>QARL AI Recommendation</p>
            <p className="font-medium text-slate-400 mt-0.5" style={{ fontSize: 10 }}>
              Based on 6 enrichment signals · 18 evidence sources · 4 models
            </p>
          </div>
          <span
            className="ml-auto font-black rounded-full border uppercase shrink-0"
            style={{ fontSize: 7.5, letterSpacing: '0.10em', padding: '3px 12px', background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }}
          >
            Ready for Human Review
          </span>
        </div>

        {/* Bullets */}
        <div style={{ padding: '16px 20px 18px' }} className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ width: 17, height: 17, background: i === items.length - 1 ? '#eff6ff' : '#dcfce7' }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l1.5 1.5L6.5 2" stroke={i === items.length - 1 ? BLUE : '#059669'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p
                className="font-medium leading-snug"
                style={{ fontSize: 12, color: i === items.length - 1 ? '#374151' : '#374151' }}
              >
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Documentation Package Preview + primary CTA
═══════════════════════════════════════════ */
function DocPackagePreview({ addDisabled, onAddToPackage }: { addDisabled: boolean; onAddToPackage: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 280);
    return () => clearTimeout(t);
  }, []);

  const items = [
    'Weather verification',
    'Fraud assessment',
    'Exposure profile',
    'Comparable benchmark',
    'Payment recommendation',
    'AI reasoning',
    'Evidence provenance',
  ];

  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.45s ${EASE}, transform 0.45s ${EASE}` }}>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100" style={{ padding: '14px 20px', background: 'rgba(248,250,252,0.9)' }}>
          <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)` }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.2"/>
              <path d="M6 4v4M4 6h4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-black text-[#0f3460] leading-none" style={{ fontSize: 13 }}>Documentation Package Preview</p>
            <p className="font-medium text-slate-400 mt-0.5" style={{ fontSize: 10 }}>
              These enrichments will be merged into the Interactive Documentation Workspace
            </p>
          </div>
          <span className="ml-auto font-medium text-slate-400 shrink-0" style={{ fontSize: 10 }}>
            {items.length} items
          </span>
        </div>

        {/* Checklist */}
        <div style={{ padding: '14px 20px 16px' }}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {items.map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 16, height: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.5 1.5L6.5 2" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-slate-700" style={{ fontSize: 11 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width CTA */}
        <div className="border-t border-slate-100" style={{ padding: '12px 20px' }}>
          <button
            onClick={onAddToPackage}
            disabled={addDisabled}
            className="w-full flex items-center justify-center gap-2.5 font-black rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontSize: 13,
              padding: '12px 20px',
              background: addDisabled ? '#e2e8f0' : `linear-gradient(135deg, ${BLUE} 0%, ${NAVY} 100%)`,
              color: addDisabled ? '#94a3b8' : '#fff',
              boxShadow: addDisabled ? 'none' : '0 3px 12px rgba(25,118,210,0.30)',
              transition: `opacity 0.2s ${EASE}, transform 0.1s ${EASE}, box-shadow 0.2s ${EASE}`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Add Enrichment to Documentation Package
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5h8M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Right: Insight panel
═══════════════════════════════════════════ */
function InsightPanel({ completedCount, enriched, isRunning }: {
  completedCount: number; enriched: boolean; isRunning: boolean;
}) {
  const idle = !isRunning && completedCount === 0;
  const displayItems = enriched
    ? FINAL_INSIGHTS.map((text, i) => ({ text, delay: i * 65 }))
    : RUNNING_INSIGHTS.slice(0, completedCount).map((text) => ({ text, delay: 0 }));

  return (
    <div className="space-y-4">
      {/* Enrichment insights */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
        <div className="border-b border-slate-100" style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}>
          <p className="font-black text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.13em' }}>Enrichment Insights</p>
        </div>
        <div style={{ padding: '12px 16px 14px', minHeight: 78 }}>
          {idle ? (
            <p className="font-medium text-slate-400 text-center" style={{ fontSize: 11, padding: '8px 0' }}>
              Waiting for enrichment…
            </p>
          ) : (
            <div className="space-y-2.5">
              {displayItems.map((item, i) => (
                <div key={item.text + i} className="flex items-start gap-2.5" style={{ transition: `opacity 0.35s ${EASE} ${item.delay}ms` }}>
                  <div className="rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5" style={{ width: 15, height: 15 }}>
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-medium text-slate-700 leading-snug" style={{ fontSize: 11 }}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Execution stats */}
      {(isRunning || enriched) && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
          <div className="border-b border-slate-100" style={{ padding: '12px 16px', background: 'rgba(248,250,252,0.9)' }}>
            <p className="font-black text-slate-400 uppercase" style={{ fontSize: 8, letterSpacing: '0.13em' }}>Execution Stats</p>
          </div>
          <div style={{ padding: '13px 16px' }} className="space-y-2.5">
            {[
              { label: 'Signals Checked',    value: `${completedCount} / 6` },
              { label: 'Evidence Sources',   value: `${completedCount * 3} / 18` },
              { label: 'Fraud Score',        value: 'Low' },
              { label: 'Overall Confidence', value: enriched ? '97%' : '—' },
              { label: 'ROM Type',           value: 'Measure of Loss' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="font-medium text-slate-400" style={{ fontSize: 10 }}>{stat.label}</span>
                <span className="font-black text-[#0f3460]" style={{ fontSize: 12, opacity: enriched ? 1 : 0.55, transition: `opacity 0.5s ${EASE}` }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AI Governance — consistent SVG icons, no duplicate write-status
═══════════════════════════════════════════ */
type GovernanceVariant = 'check' | 'warn' | 'neutral';
type GovernanceItem = { label: string; variant: GovernanceVariant };

function GovIcon({ variant }: { variant: GovernanceVariant }) {
  if (variant === 'check') {
    return (
      <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 14, height: 14, background: '#eff6ff' }}>
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
          <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke={BLUE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  if (variant === 'warn') {
    return (
      <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 14, height: 14, background: '#fffbeb' }}>
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
          <path d="M3.5 1.5v2.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="3.5" cy="5.3" r="0.6" fill="#b45309"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 14, height: 14, background: '#f8fafc' }}>
      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
        <circle cx="3.5" cy="3.5" r="2.5" stroke="#94a3b8" strokeWidth="1"/>
      </svg>
    </div>
  );
}

function GovernanceCard({ enriched }: { enriched: boolean }) {
  const checkItems: GovernanceItem[] = [
    { label: 'AI Generated',               variant: 'check'   },
    { label: 'Evidence Grounded',          variant: 'check'   },
    { label: 'Policy Verified',            variant: 'check'   },
    { label: 'Fraud Evaluated',            variant: 'check'   },
    { label: 'Benchmark Supported',        variant: 'check'   },
    { label: 'Human Review Required',      variant: 'warn'    },
    { label: 'Awaiting Adjuster Approval', variant: 'warn'    },
    { label: 'Not Written to ClaimCenter', variant: 'neutral' },
  ];

  const models  = ['GPT-4.1', 'Reserve Model', 'Fraud Model', 'Benchmark Engine'];
  const sources = ['Weather Service', 'Internal Claims', 'Benchmark Dataset', 'Fraud Model'];

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ boxShadow: CARD_SHADOW, borderColor: '#dbeafe' }}>
      {/* Header */}
      <div className="border-b flex items-center gap-2" style={{ padding: '11px 16px', background: 'rgba(239,246,255,0.7)', borderColor: '#dbeafe' }}>
        <div className="rounded-lg bg-blue-100 flex items-center justify-center shrink-0" style={{ width: 22, height: 22 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1L9 3.5v3L5 9 1 6.5v-3L5 1z" stroke={BLUE} strokeWidth="1.1" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="font-black text-[#0f3460]" style={{ fontSize: 11 }}>AI Governance</p>
      </div>

      <div style={{ padding: '12px 16px 14px' }} className="space-y-3">
        {/* Checklist — consistent SVG icons */}
        <div className="space-y-1.5">
          {checkItems.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <GovIcon variant={item.variant} />
              <span
                className="font-medium"
                style={{ fontSize: 10, color: item.variant === 'warn' ? '#92400e' : item.variant === 'neutral' ? '#64748b' : '#374151' }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Models Used — appears after enrichment */}
        {enriched && (
          <div className="border-t border-slate-100 pt-3">
            <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 7, letterSpacing: '0.12em' }}>Models Used</p>
            <div className="space-y-1.5">
              {models.map(m => (
                <div key={m} className="flex items-center gap-2">
                  <div className="rounded flex items-center justify-center shrink-0" style={{ width: 13, height: 13, background: '#eff6ff' }}>
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                      <circle cx="3" cy="3" r="2" stroke={BLUE} strokeWidth="0.9"/>
                      <circle cx="3" cy="3" r="0.7" fill={BLUE}/>
                    </svg>
                  </div>
                  <span className="font-medium text-slate-600" style={{ fontSize: 10 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence sources */}
        <div className="border-t border-slate-100 pt-3">
          <p className="font-black text-slate-400 uppercase mb-2" style={{ fontSize: 7, letterSpacing: '0.12em' }}>Evidence Sources</p>
          <div className="space-y-1.5">
            {sources.map(src => (
              <div key={src} className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-50 flex items-center justify-center shrink-0" style={{ width: 13, height: 13 }}>
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                    <path d="M1.5 3.5l1.5 1.5L5.5 2" stroke="#059669" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-slate-500" style={{ fontSize: 10 }}>{src}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Bottom action bar (unchanged behavior)
═══════════════════════════════════════════ */
function ActionBar({
  enriched, isRunning, addDisabled, addLabel, pkgSuccess,
  onRunEnrichment, onAddToPackage, onReturn, onNavigateToDoc,
}: {
  enriched: boolean; isRunning: boolean; addDisabled: boolean; addLabel: string; pkgSuccess: boolean;
  onRunEnrichment: () => void; onAddToPackage: () => void; onReturn: () => void; onNavigateToDoc: () => void;
}) {
  const runLabel    = enriched ? '✓ Enrichment Complete' : isRunning ? 'Running…' : 'Run Enrichment';
  const runDisabled = enriched || isRunning;
  const runStyle    = enriched
    ? { background: '#f0fdf4', color: '#059669', border: '1.5px solid #bbf7d0' }
    : isRunning
    ? { background: '#eff6ff', color: BLUE,      border: '1.5px solid #bfdbfe' }
    : { background: '#fff',    color: '#374151',  border: '1.5px solid #e2e8f0' };

  return (
    <div className="shrink-0 border-t border-slate-200" style={{ background: '#fff', padding: '12px 32px', boxShadow: '0 -1px 4px rgba(15,52,96,0.04)' }}>
      <div className="flex items-center justify-between gap-4">

        {/* Success banner */}
        <div style={{ minWidth: 300 }}>
          {pkgSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden" style={{ padding: '8px 14px', display: 'inline-block' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-full bg-emerald-200 flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.5 1.5L6 2" stroke="#059669" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-black text-emerald-800" style={{ fontSize: 11 }}>Auto-Enrichment imported</span>
              </div>
              <div className="space-y-0.5 ml-6">
                {['Weather correlation', 'Fraud assessment', 'Reserve benchmark', 'Payment recommendation', 'Documentation package updated'].map(item => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-500" style={{ fontSize: 9 }}>·</span>
                    <span className="font-medium text-emerald-700" style={{ fontSize: 10 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRunEnrichment}
            disabled={runDisabled}
            className="flex items-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97] disabled:cursor-not-allowed"
            style={{ fontSize: 12, padding: '9px 20px', ...runStyle }}
          >
            {isRunning ? (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 12"/>
              </svg>
            ) : enriched ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M3 6.5l2.5 2.5L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <polygon points="3,2 11,6.5 3,11" fill="currentColor"/>
              </svg>
            )}
            {runLabel}
          </button>

          <button
            onClick={onAddToPackage}
            disabled={addDisabled}
            className="flex items-center gap-2 font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: 12, padding: '9px 20px', background: addDisabled ? '#e2e8f0' : BLUE, color: addDisabled ? '#94a3b8' : '#fff', boxShadow: addDisabled ? 'none' : '0 2px 8px rgba(25,118,210,0.28)' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6.5 4v5M4 6.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {addLabel}
          </button>

          <div className="w-px h-6 bg-slate-200" />

          {pkgSuccess ? (
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

/* ── SVG icons ── */
function WeatherIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="white" strokeWidth="1.2"/>
      <path d="M6 1v1M6 9v1M1 5h1M10 5h1M2.5 2.5l.7.7M8.8 8.8l.7.7M2.5 7.5l.7-.7M8.8 3.2l.7-.7" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}
function ClaimsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="1.5" width="8" height="9" rx="1.2" stroke="white" strokeWidth="1.2"/>
      <path d="M4 4.5h4M4 6.5h4M4 8.5h2" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}
function FraudIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5L10.5 4v4L6 10.5 1.5 8V4L6 1.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M4 6l1.5 1.5L8 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function PropertyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1.5 10V5.5L6 2l4.5 3.5V10H8V7H4v3H1.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}
function BenchmarkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1.5 9.5l3-3 2.5 2 3.5-5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="3.5" r="1" fill="white"/>
    </svg>
  );
}
function PaymentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1.5" y="3" width="9" height="6.5" rx="1.2" stroke="white" strokeWidth="1.2"/>
      <path d="M1.5 5.5h9" stroke="white" strokeWidth="1.1"/>
      <path d="M4 7.5h1.5M7.5 7.5h.5" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}
