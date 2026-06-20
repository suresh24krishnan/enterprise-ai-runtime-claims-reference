"""
QARL Claims Assistant — FastAPI Backend
========================================
Thin FastAPI layer over the LangGraph supervisor workflow.

Endpoints:
  POST /api/qarl/workflow/run
  GET  /api/qarl/workflow/{run_id}/trace

CORS is open to the React dev server (localhost:5173).
No authentication — this is a prototype to prove orchestration architecture.
"""

from __future__ import annotations
import os
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from workflow.graph import workflow_graph
from workflow.governance import audit_log_event

app = FastAPI(
    title="QARL Claims Assistant API",
    description="LangGraph supervisor workflow for enterprise P&C claims processing.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory run store — keyed by run_id
# In production: replace with Redis, DynamoDB, or a persistent store.
_run_store: dict[str, dict[str, Any]] = {}


# ─── Request / Response models ────────────────────────────────────────────────

class WorkflowRunRequest(BaseModel):
    claimId: str
    intent: str = "coverage_workflow"


class WorkflowRunResponse(BaseModel):
    runId: str
    claimId: str
    status: str
    capabilitiesExecuted: int
    manualStepsEliminated: int
    coverageConfidence: int
    executionTimeMs: int
    capabilityResults: dict[str, Any]
    auditTraceCount: int
    completedAt: float
    adapterContracts: list[dict[str, str]]
    adapterEventCount: int


class TraceResponse(BaseModel):
    runId: str
    claimId: str
    status: str
    auditTrace: list[dict]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/qarl/workflow/run", response_model=WorkflowRunResponse)
def run_workflow(request: WorkflowRunRequest):
    """
    Execute the QARL claims workflow for the given claim ID.

    Runs the LangGraph supervisor graph synchronously and returns the final
    aggregated results. The full audit trace is stored in memory and
    retrievable via GET /api/qarl/workflow/{run_id}/trace.
    """
    run_id = str(uuid.uuid4())
    started_at = time.time()

    initial_state: dict[str, Any] = {
        "run_id": run_id,
        "claim_id": request.claimId,
        "intent": request.intent,
        "started_at": started_at,
        "current_stage": "initializing",
        "next_action": "",
        "capability_results": {},
        "audit_trace": [
            audit_log_event(run_id, request.claimId, "supervisor", "workflow_started", {"intent": request.intent})
        ],
        "status": "running",
        "capabilities_executed": 0,
        "manual_steps_eliminated": 0,
        "coverage_confidence": 0,
    }

    try:
        final_state = workflow_graph.invoke(initial_state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {exc}") from exc

    completed_at = time.time()
    execution_time_ms = round((completed_at - started_at) * 1000)

    _run_store[run_id] = final_state

    adapter_contracts = final_state.get("adapter_contracts", [])
    return WorkflowRunResponse(
        runId=run_id,
        claimId=request.claimId,
        status=final_state.get("status", "completed"),
        capabilitiesExecuted=final_state.get("capabilities_executed", 0),
        manualStepsEliminated=final_state.get("manual_steps_eliminated", 14),
        coverageConfidence=final_state.get("coverage_confidence", 98),
        executionTimeMs=execution_time_ms,
        capabilityResults=final_state.get("capability_results", {}),
        auditTraceCount=len(final_state.get("audit_trace", [])),
        completedAt=completed_at,
        adapterContracts=adapter_contracts,
        adapterEventCount=len(adapter_contracts),
    )


@app.get("/api/qarl/workflow/{run_id}/trace", response_model=TraceResponse)
def get_trace(run_id: str):
    """
    Retrieve the full audit trace for a completed workflow run.
    """
    run = _run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    return TraceResponse(
        runId=run_id,
        claimId=run.get("claim_id", ""),
        status=run.get("status", "unknown"),
        auditTrace=run.get("audit_trace", []),
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "qarl-claims-backend"}


# ─── Static frontend (production / HF Space) ─────────────────────────────────
# Activated only when the Vite build output (dist/) is present alongside the
# backend directory. In local dev the Vite dev server handles the frontend.

_DIST = Path(__file__).parent.parent / "dist"
if _DIST.is_dir():
    _ASSETS = _DIST / "assets"
    if _ASSETS.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ASSETS)), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = _DIST / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_DIST / "index.html"))
