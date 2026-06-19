# Enterprise AI Runtime – Claims Reference Implementation

Governed enterprise AI runtime demonstrating AI-assisted claims orchestration, evidence-grounded documentation, LangGraph supervision, enterprise connector contracts, human approval, and immutable auditability.

---

## Overview

This reference implementation demonstrates how a governed AI runtime can be applied to post-FNOL property and casualty claims processing. A LangGraph supervisor orchestrates five business capability agents — coverage verification, multi-party coordination, interactive documentation, auto-enrichment, and auto-alerts — each operating through typed MCP connector contracts with governance hooks at every step.

All AI-generated outputs require explicit human approval before any write-back to systems of record. The runtime produces an immutable audit trace of every governance event, tool invocation, and state transition.

---

## Features

- **Governed AI Orchestration** — LangGraph supervisor routes capability agents through a typed shared workflow state with policy gates and human-review checkpoints
- **AI-Assisted Coverage Verification** — policy lookup, coverage confirmation, and loss-type validation via mock PolicyCenter and ClaimCenter connectors
- **Multi-Party Conversation Coordination** — orchestrated inputs from adjuster, claimant, independent adjuster, and specialists
- **Interactive Documentation Workspace** — AI-assembled documentation package with reserve recommendation; write-back requires adjuster approval
- **Auto-Enrichment** — weather correlation, fraud scoring, reserve benchmarking, and prior-claims analysis via mock EDW connector
- **Auto-Alerts** — SLA-aligned follow-up scheduling and supervisor notification via mock alert-service connector
- **Immutable Audit Trace** — every node, governance event, and tool call recorded via append-only `operator.add` semantics in LangGraph state
- **Human Approval Gate** — documentation approval and ClaimCenter write-back are explicit adjuster actions; the AI never writes autonomously
- **Worklist Status Propagation** — claims written to ClaimCenter surface as "Completed" in the adjuster worklist

---

## Architecture

```
React UI (Vite + TypeScript)
        │
        │  POST /api/qarl/workflow/run  (proxied via Vite dev server)
        ▼
FastAPI Backend (Python)
        │
        ▼
LangGraph StateGraph
        │
        ├─▶ supervisor_node  ──(conditional routing)──▶
        │       ├─▶ coverage_verification_node
        │       ├─▶ multi_party_coordination_node
        │       ├─▶ interactive_documentation_node
        │       ├─▶ auto_enrichment_node
        │       └─▶ auto_alerts_node
        │                 │
        │        (each returns to supervisor)
        │
        └─▶ ClaimWorkflowState (shared typed dict)
                    audit_trace: Annotated[list[dict], operator.add]
```

**Governance hooks** (`policy_check`, `human_review_required`, `audit_log_event`) are called at every capability node. All enterprise adapter bodies are mocked with typed contracts and TODO markers for production integration.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vite 8, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Uvicorn |
| AI Orchestration | LangGraph `StateGraph`, supervisor pattern |
| State | LangGraph `TypedDict` with `operator.add` audit trace |
| Connector Contracts | Mock MCP-style Python functions (typed, stubbed) |
| Build | tsc + Vite, Python `py_compile` |

---

## Project Structure

```
/
├── backend/
│   ├── main.py                  FastAPI app, CORS, endpoints
│   ├── requirements.txt
│   ├── README_ARCHITECTURE.md   Detailed orchestration architecture
│   └── workflow/
│       ├── state.py             ClaimWorkflowState TypedDict
│       ├── graph.py             LangGraph StateGraph definition
│       ├── nodes.py             Supervisor + 5 capability nodes
│       ├── mock_tools.py        Mock MCP connector contracts
│       └── governance.py        Policy check, human review, audit log
├── src/
│   ├── App.tsx                  Root state, routing, backend trigger
│   ├── pages/                   All screen components
│   ├── components/              Shared UI components
│   ├── services/
│   │   └── qarlApi.ts           Frontend API client (fetch + types)
│   ├── data/                    Mock claims and conversation data
│   └── types/                   Shared TypeScript types
├── public/
├── package.json
├── vite.config.ts               Includes /api proxy → localhost:8000
└── tsconfig.json
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+

### Frontend

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

The Vite dev server proxies all `/api` requests to port 8000. No CORS configuration is needed during development.

### Verify backend

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/api/qarl/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"claimId": "CLM-2024-0892", "intent": "coverage_workflow"}'
```

---

## Current Status

This is a governed prototype demonstrating the runtime architecture. All enterprise connector bodies (PolicyCenter, ClaimCenter, Outlook, EDW, alert service) are mocked with typed contracts and TODO markers indicating the integration point for each real adapter.

Production integration planned as a subsequent phase following stakeholder architecture acceptance.

---

## Build

```bash
# Frontend
npm run build

# Backend syntax check
cd backend && python -m py_compile main.py workflow/*.py
```
