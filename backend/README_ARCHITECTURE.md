# QARL Claims Assistant — Backend Architecture

## Purpose

This backend is a **thin proof-of-concept** that demonstrates the Page 6 orchestration architecture without replacing the existing React UI or building real enterprise integrations. It exists to answer one question:

> Can a LangGraph supervisor coordinate five QARL capability agents over a shared typed state, with governance hooks and an audit trail, in a way that maps cleanly onto real MCP adapters once stakeholder acceptance is confirmed?

The answer is yes. This is the evidence.

---

## What This Is (and Is Not)

| This IS | This IS NOT |
|---------|-------------|
| A working LangGraph supervisor graph | A production system |
| Mock MCP tool contracts with real signatures | Real PolicyCenter / ClaimCenter adapters |
| Governance hooks (policy_check, human_review_required, audit_log_event) | A real policy engine or audit data lake |
| A FastAPI REST layer usable from the React UI | Replacement for the React prototype |
| An audit trace stored in memory | A durable event store |
| Architecture ready for real adapter drop-in | Auth, RBAC, or multi-tenant support |

---

## Architecture Overview

```
React UI (Vite + TypeScript)
        │
        │  POST /api/qarl/workflow/run
        ▼
FastAPI (main.py)
        │
        ▼
LangGraph StateGraph (workflow/graph.py)
        │
        ├─▶ supervisor_node
        │       │ route_from_supervisor (conditional edge)
        │       ▼
        ├─▶ coverage_verification_node
        │       │ calls: policy_center_get_policy, policy_center_verify_coverage, claim_center_get_claim
        │       ▼ supervisor
        ├─▶ multi_party_coordination_node
        │       │ calls: coordination_gather_participants, email_prepare_draft
        │       ▼ supervisor
        ├─▶ interactive_documentation_node
        │       │ calls: claim_center_prepare_note, claim_center_prepare_reserve_update
        │       ▼ supervisor
        ├─▶ auto_enrichment_node
        │       │ calls: data_enrichment_lookup, data_enrichment_prior_claims
        │       ▼ supervisor
        ├─▶ auto_alerts_node
        │       │ calls: alert_schedule_followup, alert_prepare_supervisor_notification
        │       ▼ supervisor ─▶ END
        │
        └─▶ ClaimWorkflowState (shared typed dict)
```

### Shared State

`ClaimWorkflowState` (workflow/state.py) is a LangGraph `TypedDict`. Every node reads from it and returns a partial update. The supervisor routing key is `next_action`.

The `audit_trace` field uses `Annotated[list[dict], operator.add]` — each node returns only its new audit events, and LangGraph appends them to the accumulated list automatically. No node overwrites prior events.

### Supervisor Pattern

The supervisor node reads `capabilities_executed` to decide which capability to run next, following a fixed sequence:

1. `coverage_verification`
2. `multi_party_coordination`
3. `interactive_documentation`
4. `auto_enrichment`
5. `auto_alerts`

After all five, the supervisor sets `next_action = "END"` and the graph terminates.

### Governance Hooks

Three hooks are called at appropriate points in each node:

- **`policy_check(claim_id, stage, payload)`** — evaluates whether the action is permitted. In production: replace with OPA, AWS Verified Permissions, or a custom rule engine.
- **`human_review_required(claim_id, stage, context)`** — returns True for any stage that requires adjuster approval before write-back. This matches the UI governance model — "Write to ClaimCenter" is always adjuster-initiated.
- **`audit_log_event(run_id, claim_id, stage, event_type, detail)`** — emits a structured event. In production: ship to Splunk, CloudWatch, or an internal audit lake.

---

## Mock MCP Tool Contracts

Each function in `workflow/mock_tools.py` represents one MCP server + tool pair. The function signature and return shape are the real contract — only the body is mocked.

| Mock Function | MCP Server | Real Adapter Needed |
|---|---|---|
| `policy_center_get_policy` | policy-center | Guidewire PolicyCenter REST API |
| `policy_center_verify_coverage` | policy-center | Guidewire PolicyCenter REST API |
| `claim_center_get_claim` | claim-center | Guidewire ClaimCenter REST API |
| `claim_center_prepare_note` | claim-center | Guidewire ClaimCenter REST API |
| `claim_center_prepare_reserve_update` | claim-center | Guidewire ClaimCenter REST API |
| `email_prepare_draft` | email | Outlook / Exchange Graph API |
| `alert_schedule_followup` | alert-service | Internal scheduling service |
| `alert_prepare_supervisor_notification` | alert-service | Internal notification service |
| `data_enrichment_lookup` | edw-enrichment | Snowflake / EDW query layer |
| `data_enrichment_prior_claims` | edw-enrichment | Snowflake / EDW query layer |
| `coordination_gather_participants` | coordination | Internal collab service |

---

## Running Locally

```bash
cd agentic-claims-assistant/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Health check:**
```bash
curl http://localhost:8000/health
```

**Run a workflow:**
```bash
curl -X POST http://localhost:8000/api/qarl/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"claimId": "CLM-2024-0892", "intent": "coverage_workflow"}'
```

**Get audit trace** (use the `runId` from the run response):
```bash
curl http://localhost:8000/api/qarl/workflow/{runId}/trace
```

**Interactive API docs:** http://localhost:8000/docs

---

## Sample Run Response

```json
{
  "runId": "3f8a2c1d-...",
  "claimId": "CLM-2024-0892",
  "status": "completed",
  "capabilitiesExecuted": 5,
  "manualStepsEliminated": 14,
  "coverageConfidence": 98,
  "auditTraceCount": 18,
  "completedAt": 1718800000.0,
  "capabilityResults": {
    "coverageVerification": {
      "policyVerified": true,
      "coverageConfidence": 98,
      "humanReviewRequired": true
    },
    "multiPartyCoordination": { "coordinationConfidence": 94, ... },
    "interactiveDocumentation": { "writeToClaimCenter": false, ... },
    "autoEnrichment": { "fraudScore": "Low", "weatherVerified": true, ... },
    "autoAlerts": { "followUpScheduled": true, ... }
  }
}
```

---

## Path to Production

1. **Replace mock bodies** in `workflow/mock_tools.py` with real MCP adapter calls (one function at a time — signatures stay the same).
2. **Replace governance stubs** in `workflow/governance.py` with real policy engine and audit sink integrations.
3. **Add async support** — convert `workflow_graph.invoke()` to `await workflow_graph.ainvoke()` and switch FastAPI handlers to `async def`.
4. **Add persistence** — replace the in-memory `_run_store` dict with Redis or DynamoDB.
5. **Add authentication** — add JWT/OAuth middleware to FastAPI once the integration layer is stabilized.
6. **Wire to the React UI** — the existing UI already models this workflow; connect the `/api/qarl/workflow/run` endpoint to the Journey page's "Run QARL" action.
