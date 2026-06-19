"""
Shared claim workflow state for the LangGraph supervisor.

All capability nodes read from and write to this typed state dict.
LangGraph merges node outputs onto the existing state — audit_trace uses
operator.add so each node only needs to return its new events (appended,
not replaced).
"""

import operator
from typing import Annotated, Any
from typing_extensions import TypedDict


class ClaimWorkflowState(TypedDict):
    # ── Immutable inputs ─────────────────────────────────────────────
    run_id: str
    claim_id: str
    intent: str
    started_at: float          # Unix timestamp (time.time())

    # ── Supervisor routing ───────────────────────────────────────────
    current_stage: str         # Human-readable current stage label
    next_action: str           # Internal routing key used by supervisor

    # ── Aggregated results ───────────────────────────────────────────
    capability_results: dict[str, Any]   # Keyed by camelCase capability name
    # Append semantics: each node returns only the NEW events it produced
    audit_trace: Annotated[list[dict], operator.add]

    # ── Progress counters ────────────────────────────────────────────
    status: str                # "running" | "completed" | "failed"
    capabilities_executed: int
    manual_steps_eliminated: int
    coverage_confidence: int   # Final confidence score (0-100)
