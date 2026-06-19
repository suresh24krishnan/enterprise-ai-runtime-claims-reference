/**
 * QARL Claims Assistant — Frontend API Client
 *
 * Thin fetch wrapper over the FastAPI + LangGraph backend.
 * Falls back gracefully when the backend is unavailable.
 *
 * Base URL: VITE_QARL_API_BASE_URL env var, defaulting to http://localhost:8000
 */

// Empty string = same-origin, routed through Vite dev proxy (/api → localhost:8000).
// Override with VITE_QARL_API_BASE_URL for production or custom environments.
const API_BASE =
  (import.meta.env.VITE_QARL_API_BASE_URL as string | undefined) ?? '';

export interface WorkflowRunResult {
  runId: string;
  claimId: string;
  status: string;
  capabilitiesExecuted: number;
  manualStepsEliminated: number;
  coverageConfidence: number;
  executionTimeMs: number;
  capabilityResults: Record<string, unknown>;
  auditTraceCount: number;
  completedAt: number;
}

export interface WorkflowTraceResult {
  runId: string;
  claimId: string;
  status: string;
  auditTrace: Record<string, unknown>[];
}

export async function runQarlWorkflow(claimId: string): Promise<WorkflowRunResult> {
  const response = await fetch(`${API_BASE}/api/qarl/workflow/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimId, intent: 'coverage_workflow' }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json() as Promise<WorkflowRunResult>;
}

export async function getWorkflowTrace(runId: string): Promise<WorkflowTraceResult> {
  const response = await fetch(`${API_BASE}/api/qarl/workflow/${runId}/trace`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json() as Promise<WorkflowTraceResult>;
}
