import { useState, useRef } from 'react';
import './index.css';
import type { Claim, ChatMessage } from './types';
import NavBar from './components/NavBar';
import WorklistPage from './pages/WorklistPage';
import ClaimDetailPage from './pages/ClaimDetailPage';
import PostFnolCoverageJourneyPage from './pages/PostFnolCoverageJourneyPage';
import InteractiveDocumentationPage from './pages/InteractiveDocumentationPage';
import MultiPartyConversationPage from './pages/MultiPartyConversationPage';
import AutoEnrichmentsPage from './pages/AutoEnrichmentsPage';
import type { EnrichmentPackage } from './pages/AutoEnrichmentsPage';
import AutoAlertsPage from './pages/AutoAlertsPage';
import type { AlertPackage } from './pages/AutoAlertsPage';
import { runQarlWorkflow } from './services/qarlApi';
import type { WorkflowRunResult } from './services/qarlApi';
import type { ClaimStatus } from './types';

type Screen = 'workspace' | 'journey' | 'documentation' | 'multiparty' | 'enrichments' | 'alerts';

interface CapabilityState {
  multiPartySummaryGenerated: boolean;
  multiPartyAdded: boolean;
  documentationVisited: boolean;
  enrichmentRun: boolean;
  enrichmentAdded: boolean;
  alertsRun: boolean;
  alertsAdded: boolean;
}

const INITIAL_CAPABILITY_STATE: CapabilityState = {
  multiPartySummaryGenerated: false,
  multiPartyAdded: false,
  documentationVisited: false,
  enrichmentRun: false,
  enrichmentAdded: false,
  alertsRun: false,
  alertsAdded: false,
};

interface ConversationState {
  messages: ChatMessage[];
  step: number;
}

export interface DocumentationPackage {
  participants: string[];
  assessment: string[];
  recommendation: string;
  confidence: number;
  reserveAmount: number;
  enrichment?: EnrichmentPackage;
  alerts?: AlertPackage;
}

export default function App() {
  const [activeClaim, setActiveClaim] = useState<Claim | null>(null);
  const [screen, setScreen] = useState<Screen>('workspace');
  const [docPackage, setDocPackage] = useState<DocumentationPackage | null>(null);
  const [journeyAnimated, setJourneyAnimated] = useState(false);
  const [capState, setCapState] = useState<CapabilityState>(INITIAL_CAPABILITY_STATE);
  const lastClaimIdRef = useRef<string | null>(null);
  // Per-claim conversation persistence — never cleared, keyed by claimId
  const [convMap, setConvMap] = useState<Record<string, ConversationState>>({});
  // Tracks which claims have had their AI Workflow opened (for one-time CTA visibility)
  const [journeyOpenedSet, setJourneyOpenedSet] = useState<Set<string>>(new Set());
  // Per-claim documentation approval and ClaimCenter write-back state
  const [claimWorkflowState, setClaimWorkflowState] = useState<Record<string, { documentationApproved: boolean; claimCenterWritten: boolean }>>({});
  // Per-claim LangGraph backend results
  const [workflowRunMap, setWorkflowRunMap] = useState<Record<string, WorkflowRunResult>>({});
  const [backendStatusMap, setBackendStatusMap] = useState<Record<string, 'loading' | 'connected' | 'prototype'>>({});
  // Per-claim workflow lifecycle status (single source of truth for worklist)
  const [workflowStatusMap, setWorkflowStatusMap] = useState<Record<string, ClaimStatus>>({});

  const handleSelectClaim = (claim: Claim) => {
    const isNewClaim = claim.id !== lastClaimIdRef.current;
    lastClaimIdRef.current = claim.id;
    setScreen('workspace');
    setActiveClaim(claim);
    if (isNewClaim) {
      setDocPackage(null);
      setJourneyAnimated(false);
      setCapState(INITIAL_CAPABILITY_STATE);
    }
  };

  const handleNavigateToDocumentation = () => {
    setCapState(prev => ({ ...prev, documentationVisited: true }));
    setScreen('documentation');
  };

  const handleBack = () => {
    setActiveClaim(null);
    setScreen('workspace');
    setDocPackage(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <NavBar onLogoClick={handleBack} />
      {!activeClaim ? (
        <WorklistPage
          onSelectClaim={handleSelectClaim}
          claimStatusOverrides={{
            // workflow lifecycle status takes priority; fall back to doc-approval 'Completed'
            ...Object.fromEntries(
              Object.entries(claimWorkflowState)
                .filter(([, s]) => s.claimCenterWritten)
                .map(([id]) => [id, 'Completed' as const])
            ),
            ...workflowStatusMap,
          }}
        />
      ) : screen === 'documentation' ? (
        <InteractiveDocumentationPage
          claim={activeClaim}
          onBack={() => setScreen('journey')}
          docPackage={docPackage}
          documentationApproved={claimWorkflowState[activeClaim.id]?.documentationApproved}
          onDocumentationApproved={() => setClaimWorkflowState(prev => ({
            ...prev,
            [activeClaim.id]: { ...prev[activeClaim.id], documentationApproved: true, claimCenterWritten: prev[activeClaim.id]?.claimCenterWritten ?? false },
          }))}
          claimCenterWritten={claimWorkflowState[activeClaim.id]?.claimCenterWritten}
          onClaimCenterWritten={() => setClaimWorkflowState(prev => ({
            ...prev,
            [activeClaim.id]: { documentationApproved: true, claimCenterWritten: true },
          }))}
        />
      ) : screen === 'multiparty' ? (
        <MultiPartyConversationPage
          claim={activeClaim}
          onBack={() => setScreen('journey')}
          onPackageImported={(pkg) => {
            setDocPackage(pkg);
            setCapState(prev => ({ ...prev, multiPartyAdded: true, documentationVisited: true }));
          }}
          onNavigateToDocumentation={handleNavigateToDocumentation}
          initialSummaryGenerated={capState.multiPartySummaryGenerated}
          initialDocAdded={capState.multiPartyAdded}
          onSummaryGenerated={() => setCapState(prev => ({ ...prev, multiPartySummaryGenerated: true }))}
        />
      ) : screen === 'enrichments' ? (
        <AutoEnrichmentsPage
          claim={activeClaim}
          onBack={() => setScreen('journey')}
          docPackage={docPackage}
          onEnrichmentAdded={(enrichment) => {
            setDocPackage(prev => prev
              ? { ...prev, enrichment }
              : { participants: [], assessment: [], recommendation: '', confidence: 0, reserveAmount: activeClaim.reserve, enrichment }
            );
            setCapState(prev => ({ ...prev, enrichmentAdded: true }));
          }}
          onNavigateToDocumentation={handleNavigateToDocumentation}
          initialEnrichmentRun={capState.enrichmentRun}
          initialEnrichmentAdded={capState.enrichmentAdded}
          onEnrichmentRun={() => setCapState(prev => ({ ...prev, enrichmentRun: true }))}
        />
      ) : screen === 'alerts' ? (
        <AutoAlertsPage
          claim={activeClaim}
          onBack={() => setScreen('journey')}
          docPackage={docPackage}
          onAlertAdded={(alerts) => {
            setDocPackage(prev => prev
              ? { ...prev, alerts }
              : { participants: [], assessment: [], recommendation: '', confidence: 0, reserveAmount: activeClaim.reserve, alerts }
            );
            setCapState(prev => ({ ...prev, alertsAdded: true }));
          }}
          onNavigateToDocumentation={handleNavigateToDocumentation}
          initialAlertsRun={capState.alertsRun}
          initialAlertsAdded={capState.alertsAdded}
          onAlertsRun={() => setCapState(prev => ({ ...prev, alertsRun: true }))}
        />
      ) : screen === 'journey' ? (
        <PostFnolCoverageJourneyPage
          claim={activeClaim}
          onBack={() => setScreen('workspace')}
          onViewDocumentation={handleNavigateToDocumentation}
          onViewMultiParty={() => setScreen('multiparty')}
          onViewEnrichments={() => setScreen('enrichments')}
          onViewAlerts={() => setScreen('alerts')}
          hasAnimated={journeyAnimated}
          onAnimationComplete={() => setJourneyAnimated(true)}
          capFlags={capState}
          workflowRun={workflowRunMap[activeClaim.id] ?? null}
          backendStatus={backendStatusMap[activeClaim.id] ?? null}
          onWorkflowStatus={(status) => {
            const claimId = activeClaim.id;
            setWorkflowStatusMap(prev => ({ ...prev, [claimId]: status }));
          }}
        />
      ) : (
        <ClaimDetailPage
          key={activeClaim.id}
          claim={activeClaim}
          onBack={handleBack}
          onViewJourney={() => {
            setJourneyOpenedSet(prev => { const s = new Set(prev); s.add(activeClaim.id); return s; });
            setScreen('journey');
            // Trigger backend whenever no successful run exists and none is in flight
            if (!workflowRunMap[activeClaim.id] && backendStatusMap[activeClaim.id] !== 'loading') {
              const claimId = activeClaim.id;
              setBackendStatusMap(prev => ({ ...prev, [claimId]: 'loading' }));
              runQarlWorkflow(claimId)
                .then(result => {
                  setWorkflowRunMap(prev => ({ ...prev, [claimId]: result }));
                  setBackendStatusMap(prev => ({ ...prev, [claimId]: 'connected' }));
                })
                .catch((err: unknown) => {
                  console.error('LangGraph connection failed:', err);
                  setBackendStatusMap(prev => ({ ...prev, [claimId]: 'prototype' }));
                });
            }
          }}
          onViewDocumentation={handleNavigateToDocumentation}
          conversationState={convMap[activeClaim.id]}
          onConversationUpdate={(msgs, step) =>
            setConvMap(prev => ({ ...prev, [activeClaim.id]: { messages: msgs, step } }))
          }
          journeyEverOpened={journeyOpenedSet.has(activeClaim.id)}
        />
      )}
    </div>
  );
}
