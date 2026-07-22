"""
Infra-correlation rule engine — deterministic, NOT machine learning.

Given a transaction that the fraud model flagged, decide whether the anomaly can
be explained by an infrastructure incident rather than genuine fraud. This
re-labels fraud-model outputs before they reach a decision layer, so that e.g. a
retry-storm producing duplicate charges during an outage is not treated as fraud.

Rule:
  A flagged transaction is "infra_induced" if its timestamp falls inside an
  active — or recently active, within `propagation_delay_s` (default 15s) after
  end_time — incident on:
      * the component the transaction is associated with, OR
      * any component that component depends on (topology.json `depends_on`).

Input schemas:
  incidents.csv : incident_id, component_id, start_time, end_time, fault_type
  topology.json : nodes with `id`, `type`, and a `depends_on` list of
                  component ids each node relies on.

This module is pure/deterministic and holds no ML state — it is safe to call per
transaction from a pipeline.

Runnable standalone:  python infra_correlation.py
"""

from __future__ import annotations

import json

import pandas as pd


def load_topology(topology: dict | str) -> dict[str, list[str]]:
    """Return a {component_id: [depends_on...]} map.

    Accepts either a parsed topology dict or a path to topology.json. Primary
    schema is a list of nodes each with `id` + `depends_on`. As a convenience we
    also derive `depends_on` from an edge list (`source`/`target`) if that is how
    the file is shaped instead.
    """
    if isinstance(topology, str):
        with open(topology) as fh:
            topology = json.load(fh)

    nodes = topology.get("nodes") or topology.get("components") or []
    depends: dict[str, list[str]] = {}
    for node in nodes:
        nid = node["id"]
        depends.setdefault(nid, [])
        for dep in node.get("depends_on", []) or []:
            depends[nid].append(dep)

    # Fallback: build depends_on from a directed edge list if present and no
    # explicit depends_on was found. An edge source->target is read as
    # "source depends_on target".
    edges = topology.get("dependencies") or topology.get("edges") or []
    if edges and not any(depends.values()):
        for edge in edges:
            src, dst = edge.get("source"), edge.get("target")
            if src is None or dst is None:
                continue
            depends.setdefault(src, [])
            depends.setdefault(dst, [])
            depends[src].append(dst)

    return depends


def correlate_transaction(
    transaction: dict | pd.Series,
    incidents: pd.DataFrame,
    topology: dict | str,
    component_id: str | None = None,
    propagation_delay_s: int = 15,
    depends_map: dict[str, list[str]] | None = None,
) -> dict:
    """Classify a flagged transaction as infra_induced or uncorrelated.

    `component_id` is the component the transaction is associated with (e.g. the
    payment gateway it routed through). If omitted, it is read from the
    transaction's own `component_id` field. The prompt's transactions schema has
    no component column, so callers typically pass it explicitly.

    Returns:
        {
          "classification": "infra_induced" | "uncorrelated",
          "incident_id": <str or None>,
          "matched_component": <str or None>,   # which comp had the incident
          "via_dependency": <bool>,             # matched through depends_on
          "transaction_id": <str or None>,
        }
    """
    tx = dict(transaction)
    comp = component_id if component_id is not None else tx.get("component_id")
    result = {
        "classification": "uncorrelated",
        "incident_id": None,
        "matched_component": None,
        "via_dependency": False,
        "transaction_id": tx.get("transaction_id"),
    }
    if comp is None:
        return result  # nothing to correlate against

    depends = depends_map if depends_map is not None else load_topology(topology)
    # candidate components: the transaction's own + its direct dependencies
    candidates = {comp, *depends.get(comp, [])}

    ts = pd.to_datetime(tx["timestamp"], utc=True)

    inc = incidents.copy()
    inc["start_time"] = pd.to_datetime(inc["start_time"], utc=True)
    inc["end_time"] = pd.to_datetime(inc["end_time"], utc=True)
    delay = pd.Timedelta(seconds=propagation_delay_s)

    matches = []
    for _, row in inc.iterrows():
        if row["component_id"] not in candidates:
            continue
        # active, or recently active within the propagation delay after end.
        if row["start_time"] <= ts <= row["end_time"] + delay:
            matches.append(row)

    if not matches:
        return result

    # Prefer a match on the transaction's own component over a dependency; then
    # the most recently started incident.
    matches.sort(
        key=lambda r: (r["component_id"] == comp, r["start_time"]), reverse=True
    )
    best = matches[0]
    result.update(
        classification="infra_induced",
        incident_id=best["incident_id"],
        matched_component=best["component_id"],
        via_dependency=best["component_id"] != comp,
    )
    return result


# --------------------------------------------------------------------------- #
# Standalone sanity check
# --------------------------------------------------------------------------- #
def _dummy_incidents() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "incident_id": "inc-001",
                "component_id": "payment-service",
                "start_time": "2026-07-20T09:00:00Z",
                "end_time": "2026-07-20T09:05:00Z",
                "fault_type": "connection_pool_exhaustion",
            },
            {
                "incident_id": "inc-002",
                "component_id": "database",
                "start_time": "2026-07-20T10:00:00Z",
                "end_time": "2026-07-20T10:03:00Z",
                "fault_type": "disk_saturation",
            },
        ]
    )


def _dummy_topology() -> dict:
    # payment-gateway depends on payment-service, which depends on database.
    return {
        "nodes": [
            {"id": "payment-gateway", "type": "gateway", "depends_on": ["payment-service"]},
            {"id": "payment-service", "type": "service", "depends_on": ["database"]},
            {"id": "database", "type": "datastore", "depends_on": []},
        ]
    }


if __name__ == "__main__":
    incidents = _dummy_incidents()
    topology = _dummy_topology()
    print("=== InfraCorrelation sanity check (hand-built dummy data) ===")

    cases = [
        (
            "during payment-service outage (own component)",
            {
                "transaction_id": "tx-A",
                "timestamp": "2026-07-20T09:02:00Z",
                "component_id": "payment-service",
            },
            None,
        ),
        (
            "gateway txn during dependency (payment-service) outage",
            {
                "transaction_id": "tx-B",
                "timestamp": "2026-07-20T09:01:30Z",
            },
            "payment-gateway",  # component passed explicitly
        ),
        (
            "8s after end_time -> within 15s propagation delay",
            {
                "transaction_id": "tx-C",
                "timestamp": "2026-07-20T09:05:08Z",
                "component_id": "payment-service",
            },
            None,
        ),
        (
            "long after any incident -> genuine (uncorrelated)",
            {
                "transaction_id": "tx-D",
                "timestamp": "2026-07-20T12:00:00Z",
                "component_id": "payment-service",
            },
            None,
        ),
    ]

    depends = load_topology(topology)
    print(f"dependency map: {depends}\n")
    for label, tx, comp in cases:
        res = correlate_transaction(
            tx, incidents, topology, component_id=comp, propagation_delay_s=15
        )
        print(f"- {label}")
        print(f"    {res}")
