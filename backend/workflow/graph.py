"""
LangGraph StateGraph — QARL Supervisor Workflow
================================================
Builds and compiles the claims workflow graph.

Graph topology:
  START
    └─▶ supervisor ─▶ (conditional edge: next_action)
          ├─▶ coverage_verification  ─▶ supervisor
          ├─▶ multi_party_coordination ─▶ supervisor
          ├─▶ interactive_documentation ─▶ supervisor
          ├─▶ auto_enrichment ─▶ supervisor
          ├─▶ auto_alerts ─▶ supervisor
          └─▶ END
"""

from __future__ import annotations
from langgraph.graph import StateGraph, START, END

from workflow.state import ClaimWorkflowState
from workflow.nodes import (
    supervisor_node,
    route_from_supervisor,
    coverage_verification_node,
    multi_party_coordination_node,
    interactive_documentation_node,
    auto_enrichment_node,
    auto_alerts_node,
    CAPABILITY_SEQUENCE,
)


def build_graph():
    """Build and compile the QARL claims workflow graph."""
    builder = StateGraph(ClaimWorkflowState)

    # Register nodes
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("coverage_verification", coverage_verification_node)
    builder.add_node("multi_party_coordination", multi_party_coordination_node)
    builder.add_node("interactive_documentation", interactive_documentation_node)
    builder.add_node("auto_enrichment", auto_enrichment_node)
    builder.add_node("auto_alerts", auto_alerts_node)

    # Entry point
    builder.add_edge(START, "supervisor")

    # Conditional routing out of supervisor
    builder.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "coverage_verification": "coverage_verification",
            "multi_party_coordination": "multi_party_coordination",
            "interactive_documentation": "interactive_documentation",
            "auto_enrichment": "auto_enrichment",
            "auto_alerts": "auto_alerts",
            "END": END,
        },
    )

    # Each capability returns to supervisor
    for cap in CAPABILITY_SEQUENCE:
        builder.add_edge(cap, "supervisor")

    return builder.compile()


# Module-level compiled graph — imported by main.py
workflow_graph = build_graph()
