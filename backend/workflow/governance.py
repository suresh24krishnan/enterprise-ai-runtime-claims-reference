"""
Governance Hooks
================
Mocked governance functions that mirror the QARL policy gate pattern.
In production these call the enterprise policy engine, compliance API,
and audit data lake.

Replace each function body with the real integration once architecture
acceptance is confirmed.
"""

from __future__ import annotations
import time
import uuid


def policy_check(claim_id: str, stage: str, payload: dict) -> dict:
    """
    Evaluate whether the given stage/action is permitted by enterprise policy.

    TODO: Replace with real policy engine call (e.g., OPA, AWS Verified Permissions,
          or a custom RuleEngine REST endpoint).

    Returns:
        dict with keys: allowed (bool), policy_id (str), reason (str)
    """
    # All actions permitted in mock — real engine would evaluate RBAC, SLA rules,
    # coverage limits, and regulatory constraints.
    return {
        "allowed": True,
        "policy_id": f"POL-{stage.upper()}-001",
        "claim_id": claim_id,
        "stage": stage,
        "reason": "Mock policy gate: all actions permitted in prototype mode.",
        "evaluated_at": time.time(),
    }


def human_review_required(claim_id: str, stage: str, context: dict) -> bool:
    """
    Determine whether a stage output requires mandatory human review before
    any write-back to system of record.

    TODO: Replace with real human-in-the-loop escalation rules. Typical triggers:
      - Reserve delta > threshold
      - Fraud score > low
      - Policy limit proximity
      - Regulatory jurisdiction flag

    Returns:
        bool — True means the adjuster must approve before ClaimCenter write.
    """
    # In the prototype, ALWAYS require human review for any write-back.
    # This matches the UI governance model (adjuster must click "Write to ClaimCenter").
    write_back_stages = {
        "interactive_documentation",
        "coverage_verification",
        "multi_party_coordination",
    }
    return stage in write_back_stages


def audit_log_event(
    run_id: str,
    claim_id: str,
    stage: str,
    event_type: str,
    detail: dict | None = None,
) -> dict:
    """
    Emit a structured audit event.

    TODO: Replace with real audit sink — Splunk HEC, AWS CloudWatch, Azure Monitor,
          or an internal audit-data-lake ingest endpoint.

    event_type conventions:
      node_started     — capability node began execution
      node_completed   — capability node returned results
      policy_checked   — policy gate evaluated
      human_required   — flagged for adjuster review
      tool_called      — MCP mock tool invoked
      workflow_started — supervisor received the run request
      workflow_ended   — all stages complete

    Returns:
        The event dict (caller may include it in audit_trace).
    """
    event: dict = {
        "event_id": str(uuid.uuid4()),
        "run_id": run_id,
        "claim_id": claim_id,
        "stage": stage,
        "event_type": event_type,
        "timestamp": time.time(),
        "detail": detail or {},
    }
    # TODO: ship to real sink — e.g., requests.post(AUDIT_ENDPOINT, json=event)
    return event
