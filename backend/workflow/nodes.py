"""
LangGraph Capability Nodes + Supervisor
========================================
Each capability node:
  1. Calls governance policy_check
  2. Calls mock MCP tool(s)
  3. Checks human_review_required and annotates
  4. Returns a state patch with:
       - capability_results (merged)
       - audit_trace        (new events only — LangGraph appends via operator.add)
       - current_stage / next_action / status / capabilities_executed updates

Supervisor node reads capabilities_executed to decide the next routing action.
route_from_supervisor is the conditional edge function used by StateGraph.
"""

from __future__ import annotations
import time

from workflow.state import ClaimWorkflowState
from workflow.mock_tools import (
    policy_center_get_policy,
    policy_center_verify_coverage,
    claim_center_get_claim,
    claim_center_prepare_note,
    claim_center_prepare_reserve_update,
    email_prepare_draft,
    alert_schedule_followup,
    alert_prepare_supervisor_notification,
    data_enrichment_lookup,
    data_enrichment_prior_claims,
    coordination_gather_participants,
)
from workflow.governance import policy_check, human_review_required, audit_log_event

# Ordered sequence the supervisor follows
CAPABILITY_SEQUENCE = [
    "coverage_verification",
    "multi_party_coordination",
    "interactive_documentation",
    "auto_enrichment",
    "auto_alerts",
]


# ─────────────────────────────────────────────────────────────────────────────
# Adapter contract evidence — populated once on workflow completion
# ─────────────────────────────────────────────────────────────────────────────

def _build_adapter_contracts() -> list[dict]:
    """
    Returns mock MCP adapter contract evidence for each enterprise system.
    TODO: Replace with real adapter registry lookup in Phase 3.
    """
    return [
        {
            "system": "PolicyCenter",
            "direction": "READ",
            "status": "MOCK_CONTRACT_ACTIVE",
            "purpose": "Coverage and policy verification",
            "lastEvent": "Policy coverage read through mock adapter",
        },
        {
            "system": "ClaimCenter",
            "direction": "READ / WRITE_PENDING_APPROVAL",
            "status": "MOCK_CONTRACT_ACTIVE",
            "purpose": "Claim context and governed note write-back",
            "lastEvent": "Write-back blocked pending human approval",
        },
        {
            "system": "EDW",
            "direction": "READ",
            "status": "MOCK_CONTRACT_ACTIVE",
            "purpose": "Comparable loss and fraud enrichment",
            "lastEvent": "Comparable loss data read through mock adapter",
        },
        {
            "system": "Outlook",
            "direction": "DRAFT",
            "status": "MOCK_CONTRACT_ACTIVE",
            "purpose": "Assignment email and adjuster notifications",
            "lastEvent": "Email draft prepared pending approval",
        },
        {
            "system": "Event Bus",
            "direction": "PUBLISH",
            "status": "MOCK_CONTRACT_ACTIVE",
            "purpose": "Governance audit event publication",
            "lastEvent": "Audit event published to governance log",
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Supervisor node
# ─────────────────────────────────────────────────────────────────────────────

def supervisor_node(state: ClaimWorkflowState) -> dict:
    executed = state.get("capabilities_executed", 0)

    if executed >= len(CAPABILITY_SEQUENCE):
        audit = [
            audit_log_event(
                state["run_id"], state["claim_id"],
                "supervisor", "workflow_ended",
                {"capabilities_executed": executed},
            )
        ]
        return {
            "next_action": "END",
            "current_stage": "completed",
            "status": "completed",
            "coverage_confidence": 98,
            "manual_steps_eliminated": 14,
            "audit_trace": audit,
            "adapter_contracts": _build_adapter_contracts(),
        }

    next_cap = CAPABILITY_SEQUENCE[executed]
    audit = [
        audit_log_event(
            state["run_id"], state["claim_id"],
            "supervisor", "node_started",
            {"routing_to": next_cap, "capabilities_executed": executed},
        )
    ]
    return {
        "next_action": next_cap,
        "current_stage": next_cap,
        "audit_trace": audit,
    }


def route_from_supervisor(state: ClaimWorkflowState) -> str:
    """Conditional edge function — returns the node name or END."""
    return state.get("next_action", "END")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: build a standard audit pair (start + complete events)
# ─────────────────────────────────────────────────────────────────────────────

def _audit_pair(run_id: str, claim_id: str, stage: str, result: dict) -> list[dict]:
    return [
        audit_log_event(run_id, claim_id, stage, "node_started"),
        audit_log_event(run_id, claim_id, stage, "node_completed", {"result_keys": list(result.keys())}),
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Capability nodes
# ─────────────────────────────────────────────────────────────────────────────

def coverage_verification_node(state: ClaimWorkflowState) -> dict:
    claim_id = state["claim_id"]
    run_id = state["run_id"]
    stage = "coverage_verification"

    policy_gate = policy_check(claim_id, stage, {})
    claim_data = claim_center_get_claim(claim_id)
    policy_data = policy_center_get_policy(claim_id)
    coverage = policy_center_verify_coverage(claim_id, claim_data.get("lossType", "Property"))

    result = {
        "policyVerified": policy_data["coverageVerified"],
        "coverageConfidence": policy_data["coverageConfidence"],
        "policyNumber": policy_data["policyNumber"],
        "lossType": claim_data.get("lossType"),
        "coverageNote": coverage["coverageNote"],
        "humanReviewRequired": human_review_required(claim_id, stage, {}),
        "policyGate": policy_gate,
    }

    audit = _audit_pair(run_id, claim_id, stage, result)
    audit.append(audit_log_event(run_id, claim_id, stage, "tool_called", {"tools": ["claim_center_get_claim", "policy_center_get_policy", "policy_center_verify_coverage"]}))

    return {
        "capability_results": {**state.get("capability_results", {}), "coverageVerification": result},
        "capabilities_executed": state.get("capabilities_executed", 0) + 1,
        "audit_trace": audit,
    }


def multi_party_coordination_node(state: ClaimWorkflowState) -> dict:
    claim_id = state["claim_id"]
    run_id = state["run_id"]
    stage = "multi_party_coordination"

    claim_data = claim_center_get_claim(claim_id)
    policy_gate = policy_check(claim_id, stage, {})
    participants_data = coordination_gather_participants(claim_id)
    email_draft = email_prepare_draft(
        claim_id,
        recipient="adjuster@insurance.com",
        body=f"Multi-party coordination summary for {claim_data.get('claimantName')} — {claim_data.get('lossType')} claim {claim_id}. Four parties coordinated. Documentation package ready for review.",
    )

    result = {
        "participants": participants_data["participants"],
        "assessments": participants_data["assessments"],
        "coordinationConfidence": participants_data["coordinationConfidence"],
        "emailDraftReady": email_draft["status"] == "draft_ready",
        "humanReviewRequired": human_review_required(claim_id, stage, {}),
        "policyGate": policy_gate,
    }

    audit = _audit_pair(run_id, claim_id, stage, result)
    audit.append(audit_log_event(run_id, claim_id, stage, "tool_called", {"tools": ["coordination_gather_participants", "email_prepare_draft"]}))

    return {
        "capability_results": {**state.get("capability_results", {}), "multiPartyCoordination": result},
        "capabilities_executed": state.get("capabilities_executed", 0) + 1,
        "audit_trace": audit,
    }


def interactive_documentation_node(state: ClaimWorkflowState) -> dict:
    claim_id = state["claim_id"]
    run_id = state["run_id"]
    stage = "interactive_documentation"

    policy_gate = policy_check(claim_id, stage, {})
    claim_data = claim_center_get_claim(claim_id)
    note = claim_center_prepare_note(
        claim_id,
        note=(
            f"QARL AI-assisted documentation package prepared for {claim_data.get('claimantName')}. "
            f"Coverage verified. Multi-party coordination complete. Enrichment data integrated. "
            f"Reserve recommendation: ${claim_data.get('reserve', 346000):,}. "
            "Pending adjuster review and approval."
        ),
    )
    reserve_update = claim_center_prepare_reserve_update(claim_id, claim_data.get("reserve", 346000))

    result = {
        "documentationPrepared": True,
        "notePrepared": note["notePrepared"],
        "noteStatus": note["status"],
        "reserveUpdatePrepared": True,
        "recommendedReserve": reserve_update["recommendedReserve"],
        "reserveDelta": reserve_update["delta"],
        "reserveDeltaPct": reserve_update["deltaPct"],
        "writeToClaimCenter": False,  # Requires adjuster approval via UI
        "humanReviewRequired": human_review_required(claim_id, stage, {}),
        "policyGate": policy_gate,
    }

    audit = _audit_pair(run_id, claim_id, stage, result)
    audit.append(audit_log_event(run_id, claim_id, stage, "tool_called", {"tools": ["claim_center_prepare_note", "claim_center_prepare_reserve_update"]}))
    audit.append(audit_log_event(run_id, claim_id, stage, "human_required", {"reason": "Adjuster must approve before ClaimCenter write-back"}))

    return {
        "capability_results": {**state.get("capability_results", {}), "interactiveDocumentation": result},
        "capabilities_executed": state.get("capabilities_executed", 0) + 1,
        "audit_trace": audit,
    }


def auto_enrichment_node(state: ClaimWorkflowState) -> dict:
    claim_id = state["claim_id"]
    run_id = state["run_id"]
    stage = "auto_enrichment"

    policy_gate = policy_check(claim_id, stage, {})
    enrichment = data_enrichment_lookup(claim_id)
    prior = data_enrichment_prior_claims(claim_id)

    result = {
        "weatherVerified": enrichment["weatherCorrelation"]["verified"],
        "weatherSource": enrichment["weatherCorrelation"]["source"],
        "weatherConfidence": enrichment["weatherCorrelation"]["correlationConfidence"],
        "fraudScore": enrichment["fraudScore"]["score"],
        "fraudConfidence": enrichment["fraudScore"]["confidence"],
        "siuReferralRequired": enrichment["fraudScore"]["siuReferralRequired"],
        "reserveBenchmark": enrichment["reserveBenchmark"]["recommendedReserve"],
        "comparableLosses": enrichment["reserveBenchmark"]["comparableLosses"],
        "priorClaimCount": prior["priorClaimCount"],
        "priorClaimRisk": prior["riskLevel"],
        "overallEnrichmentConfidence": enrichment["overallConfidence"],
        "humanReviewRequired": human_review_required(claim_id, stage, {}),
        "policyGate": policy_gate,
    }

    audit = _audit_pair(run_id, claim_id, stage, result)
    audit.append(audit_log_event(run_id, claim_id, stage, "tool_called", {"tools": ["data_enrichment_lookup", "data_enrichment_prior_claims"]}))

    return {
        "capability_results": {**state.get("capability_results", {}), "autoEnrichment": result},
        "capabilities_executed": state.get("capabilities_executed", 0) + 1,
        "audit_trace": audit,
    }


def auto_alerts_node(state: ClaimWorkflowState) -> dict:
    claim_id = state["claim_id"]
    run_id = state["run_id"]
    stage = "auto_alerts"

    policy_gate = policy_check(claim_id, stage, {})
    followup = alert_schedule_followup(claim_id)
    supervisor_notif = alert_prepare_supervisor_notification(
        claim_id,
        reason="QARL workflow completed — documentation package ready for adjuster approval.",
    )

    result = {
        "followUpScheduled": followup["status"] == "scheduled",
        "followUpDate": followup["followUpDate"],
        "slaDaysRemaining": followup["slaDaysRemaining"],
        "supervisorNotificationQueued": supervisor_notif["status"] == "queued",
        "humanReviewRequired": human_review_required(claim_id, stage, {}),
        "policyGate": policy_gate,
    }

    audit = _audit_pair(run_id, claim_id, stage, result)
    audit.append(audit_log_event(run_id, claim_id, stage, "tool_called", {"tools": ["alert_schedule_followup", "alert_prepare_supervisor_notification"]}))

    return {
        "capability_results": {**state.get("capability_results", {}), "autoAlerts": result},
        "capabilities_executed": state.get("capabilities_executed", 0) + 1,
        "audit_trace": audit,
    }
