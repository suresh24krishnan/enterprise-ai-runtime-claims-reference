"""
Mock MCP Tool Contracts
=======================
These functions stand in for real MCP-connected enterprise adapters.
Each returns deterministic data that mirrors the existing UI mock data so the
backend response is consistent with what the frontend already renders.

Replace each function body with the real adapter call once stakeholder
acceptance is confirmed.

Tool naming convention follows MCP server/tool pattern:
  <server>_<action>(<args>)
"""

from __future__ import annotations
from datetime import datetime, timedelta


# ── Deterministic claim fixtures ─────────────────────────────────────────────
# Keyed by claim_id; falls back to default for unknown ids.

_CLAIM_FIXTURES: dict[str, dict] = {
    "CLM-2024-0892": {
        "id": "CLM-2024-0892",
        "claimantName": "Margaret Chen",
        "policyNumber": "POL-2024-448821",
        "lossType": "Windstorm",
        "dateOfLoss": "2024-03-15",
        "assignedAdjuster": "James Wilson",
        "reserve": 346000,
        "initialReserve": 280000,
        "slaDaysRemaining": 7,
        "status": "In Progress",
    }
}

_DEFAULT_CLAIM = {
    "id": "CLM-UNKNOWN",
    "claimantName": "Unknown Claimant",
    "policyNumber": "POL-UNKNOWN",
    "lossType": "Property Damage",
    "dateOfLoss": "2024-01-01",
    "assignedAdjuster": "Default Adjuster",
    "reserve": 250000,
    "initialReserve": 200000,
    "slaDaysRemaining": 10,
    "status": "Open",
}


def _get_fixture(claim_id: str) -> dict:
    return _CLAIM_FIXTURES.get(claim_id, {**_DEFAULT_CLAIM, "id": claim_id})


# ─────────────────────────────────────────────────────────────────────────────
# PolicyCenter Tools
# TODO: Replace mock MCP contract with real PolicyCenter adapter.
# ─────────────────────────────────────────────────────────────────────────────

def policy_center_get_policy(claim_id: str) -> dict:
    """
    Retrieve active policy details for a claim.
    MCP server: policy-center | tool: get_policy
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "policy_center_get_policy",
        "policyNumber": claim["policyNumber"],
        "status": "Active",
        "insuredName": claim["claimantName"],
        "lossType": claim["lossType"],
        "effectiveDate": "2021-03-15",
        "expirationDate": "2025-03-15",
        "coverageVerified": True,
        "coverageConfidence": 98,
        "limits": {
            "dwelling": 850000,
            "contents": 425000,
            "liability": 300000,
        },
    }


def policy_center_verify_coverage(claim_id: str, loss_type: str) -> dict:
    """
    Verify that a specific loss type is covered under the active policy.
    MCP server: policy-center | tool: verify_coverage
    """
    return {
        "tool": "policy_center_verify_coverage",
        "lossType": loss_type,
        "covered": True,
        "coverageNote": f"{loss_type} coverage confirmed in-force at date of loss.",
        "confidence": 98,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ClaimCenter Tools
# TODO: Replace mock MCP contract with real ClaimCenter adapter.
# ─────────────────────────────────────────────────────────────────────────────

def claim_center_get_claim(claim_id: str) -> dict:
    """
    Retrieve claim record from ClaimCenter.
    MCP server: claim-center | tool: get_claim
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "claim_center_get_claim",
        **claim,
        "retrievedAt": datetime.utcnow().isoformat() + "Z",
    }


def claim_center_prepare_note(claim_id: str, note: str) -> dict:
    """
    Prepare a claim note for adjuster review (does NOT write — human approval required).
    MCP server: claim-center | tool: prepare_note
    """
    return {
        "tool": "claim_center_prepare_note",
        "claimId": claim_id,
        "notePrepared": True,
        "notePreview": note[:120] + "…" if len(note) > 120 else note,
        "status": "pending_adjuster_approval",
        "writeToClaimCenter": False,  # Human approval required before write
    }


def claim_center_prepare_reserve_update(claim_id: str, reserve_amount: int) -> dict:
    """
    Prepare a reserve update recommendation (does NOT write — human approval required).
    MCP server: claim-center | tool: prepare_reserve_update
    """
    claim = _get_fixture(claim_id)
    delta = reserve_amount - claim["initialReserve"]
    return {
        "tool": "claim_center_prepare_reserve_update",
        "claimId": claim_id,
        "currentReserve": claim["initialReserve"],
        "recommendedReserve": reserve_amount,
        "delta": delta,
        "deltaPct": round((delta / claim["initialReserve"]) * 100, 1),
        "status": "pending_adjuster_approval",
        "writeToClaimCenter": False,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Email / Communication Tools
# TODO: Replace mock MCP contract with real Email/Outlook adapter.
# ─────────────────────────────────────────────────────────────────────────────

def email_prepare_draft(claim_id: str, recipient: str, body: str) -> dict:
    """
    Prepare an assignment email draft for adjuster review.
    MCP server: email | tool: prepare_draft
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "email_prepare_draft",
        "to": recipient,
        "subject": f"Assignment – {claim['claimantName']} {claim['lossType']} Claim {claim_id}",
        "bodyPreview": body[:80] + "…" if len(body) > 80 else body,
        "status": "draft_ready",
        "sentAt": None,  # Not sent until adjuster approves
    }


def alert_schedule_followup(claim_id: str) -> dict:
    """
    Schedule a follow-up alert aligned to claim SLA.
    MCP server: alert-service | tool: schedule_followup
    """
    claim = _get_fixture(claim_id)
    follow_up_date = (datetime.utcnow() + timedelta(days=claim["slaDaysRemaining"])).strftime("%Y-%m-%d")
    return {
        "tool": "alert_schedule_followup",
        "claimId": claim_id,
        "followUpDate": follow_up_date,
        "slaDaysRemaining": claim["slaDaysRemaining"],
        "alertType": "sla_followup",
        "status": "scheduled",
    }


def alert_prepare_supervisor_notification(claim_id: str, reason: str) -> dict:
    """
    Prepare a supervisor notification (queued, not sent).
    MCP server: alert-service | tool: prepare_supervisor_notification
    """
    return {
        "tool": "alert_prepare_supervisor_notification",
        "claimId": claim_id,
        "reason": reason,
        "status": "queued",
        "sentAt": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Data Enrichment Tools
# TODO: Replace mock MCP contract with real EDW/Snowflake adapter.
# ─────────────────────────────────────────────────────────────────────────────

def data_enrichment_lookup(claim_id: str) -> dict:
    """
    Run claims profile enrichment: weather, fraud, benchmarks, exposure.
    MCP server: edw-enrichment | tool: enrich_claim
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "data_enrichment_lookup",
        "claimId": claim_id,
        "weatherCorrelation": {
            "verified": True,
            "source": "NOAA Weather API",
            "eventType": "Severe Wind",
            "correlationConfidence": 99,
            "distanceMiles": 4,
        },
        "fraudScore": {
            "score": "Low",
            "confidence": 97,
            "indicators": [],
            "siuReferralRequired": False,
        },
        "reserveBenchmark": {
            "comparableLosses": 27,
            "medianSettlement": 338000,
            "recommendedReserve": claim["reserve"],
            "benchmarkDeviation": 2.3,
            "source": "Historical Loss Dataset",
        },
        "exposureProfile": {
            "propertyClass": "Residential",
            "exposureCategory": "Wind / Hail",
            "coverageStatus": "Active",
        },
        "overallConfidence": 97,
    }


def data_enrichment_prior_claims(claim_id: str) -> dict:
    """
    Review prior claims history for the insured.
    MCP server: edw-enrichment | tool: prior_claims_review
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "data_enrichment_prior_claims",
        "claimId": claim_id,
        "insuredName": claim["claimantName"],
        "priorClaimCount": 1,
        "conflictingPatterns": False,
        "policyTenureYears": 7,
        "siuHistory": False,
        "riskLevel": "Low",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Party Coordination Tools
# TODO: Replace mock MCP contract with real collaboration/messaging adapter.
# ─────────────────────────────────────────────────────────────────────────────

def coordination_gather_participants(claim_id: str) -> dict:
    """
    Gather and coordinate multi-party inputs for a claim.
    MCP server: coordination | tool: gather_participants
    """
    claim = _get_fixture(claim_id)
    return {
        "tool": "coordination_gather_participants",
        "claimId": claim_id,
        "participants": [
            "Independent Adjuster",
            "Coverage Specialist",
            claim["claimantName"],
            "Supervisor",
        ],
        "assessments": [
            "Additional structural damage identified",
            "Coverage review confirms additional applicable loss",
            "Claimant confirmed equipment exposure",
            "Documentation package ready for review",
        ],
        "coordinationConfidence": 94,
        "status": "completed",
    }
