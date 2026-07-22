"""
Part 2 — synthetic IT-system data generator (default: 7-day window).

Produces one internally-consistent dataset (shared topology, shared incident
schedule) across topology / infra metrics / network metrics / security events /
app logs / financial transactions / incident ground truth / remediation log.
Everything is written as plain files under ./data — CSV for tabular numeric
data, JSON for structured/nested records. No DB, no Parquet.

Sizing rationale: the ML layer (ml/outage_predictor.py) trains a classifier
with a train/test split BY INCIDENT, so it needs several occurrences of each
fault type to have any chance of generalizing — one example per fault type
(the old 48h/10-incident window) means the model memorizes 10 specific ramps
and fails on anything held out. SIM_HOURS and INCIDENT_COUNT below are sized
to give every fault type multiple examples while keeping public/data/ (what
the browser actually fetches — see scripts/sync_public_data.py) small; the
large infra_metrics.csv only ever feeds the ML layer and gets reduced to a
tiny sparkline summary before it reaches the app.

Run: python scripts/generate_synthetic_data.py
"""

import csv
import json
import math
import os
import random
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

random.seed(42)

# ─────────────────────────────────────────────────────────────────────────────
# Topology (mirrors src/data/serviceMapData.js so the simulation matches what
# the dashboard already renders)
# ─────────────────────────────────────────────────────────────────────────────

COMPONENTS = [
    {"id": "users",                 "label": "Users",                 "kind": "Entrypoint", "criticality": "low"},
    {"id": "load-balancer",         "label": "Load Balancer",         "kind": "Network",    "criticality": "high"},
    {"id": "web-portal",            "label": "Web Portal",            "kind": "Frontend",   "criticality": "medium"},
    {"id": "api-gateway",           "label": "API Gateway",           "kind": "Gateway",    "criticality": "critical"},
    {"id": "auth-service",          "label": "Auth Service",          "kind": "Service",    "criticality": "critical"},
    {"id": "user-service",          "label": "User Service",          "kind": "Service",    "criticality": "high"},
    {"id": "order-service",         "label": "Order Service",         "kind": "Service",    "criticality": "high"},
    {"id": "payment-service",       "label": "Payment Service",       "kind": "Service",    "criticality": "critical"},
    {"id": "search-service",        "label": "Search Service",        "kind": "Service",    "criticality": "medium"},
    {"id": "inventory-service",     "label": "Inventory Service",     "kind": "Service",    "criticality": "medium"},
    {"id": "notification-service",  "label": "Notification Service",  "kind": "Service",    "criticality": "low"},
    {"id": "redis-cache",           "label": "Redis Cache",           "kind": "Cache",      "criticality": "high"},
    {"id": "primary-db",            "label": "Primary DB",            "kind": "Datastore",  "criticality": "critical"},
    {"id": "message-queue",         "label": "Message Queue",         "kind": "Streaming",  "criticality": "high"},
    {"id": "data-warehouse",        "label": "Data Warehouse",        "kind": "Datastore",  "criticality": "medium"},
    {"id": "payment-gateway",       "label": "Payment Gateway",       "kind": "External",   "criticality": "critical"},
    {"id": "email-provider",        "label": "Email Provider",        "kind": "External",   "criticality": "low"},
]
COMPONENT_IDS = [c["id"] for c in COMPONENTS]
CRITICALITY = {c["id"]: c["criticality"] for c in COMPONENTS}

# Directed "calls" edges: source depends on / calls target.
EDGES = [
    ("users", "load-balancer"), ("load-balancer", "web-portal"), ("load-balancer", "api-gateway"),
    ("web-portal", "api-gateway"), ("api-gateway", "auth-service"), ("api-gateway", "user-service"),
    ("api-gateway", "order-service"), ("api-gateway", "payment-service"), ("api-gateway", "search-service"),
    ("auth-service", "redis-cache"), ("auth-service", "primary-db"), ("user-service", "primary-db"),
    ("user-service", "redis-cache"), ("user-service", "notification-service"),
    ("order-service", "inventory-service"), ("order-service", "payment-service"),
    ("order-service", "message-queue"), ("payment-service", "payment-gateway"),
    ("payment-service", "primary-db"), ("search-service", "redis-cache"), ("search-service", "primary-db"),
    ("inventory-service", "primary-db"), ("inventory-service", "message-queue"),
    ("message-queue", "notification-service"), ("message-queue", "data-warehouse"),
    ("notification-service", "email-provider"),
]

def dependents_of(component_id):
    """Components that call `component_id` — the ones that feel a cascading hit when it fails."""
    return [src for src, tgt in EDGES if tgt == component_id]

# ─────────────────────────────────────────────────────────────────────────────
# Timeline
# ─────────────────────────────────────────────────────────────────────────────

SIM_HOURS = 168  # 7 days — long enough to fit multiple occurrences per fault type
END = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
START = END - timedelta(hours=SIM_HOURS)

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

# ─────────────────────────────────────────────────────────────────────────────
# Fault catalog
# ─────────────────────────────────────────────────────────────────────────────

FAULT_TYPES = {
    "cpu_spike": {
        "applicable": ["web-portal", "api-gateway", "auth-service", "user-service", "order-service",
                       "payment-service", "search-service", "inventory-service", "notification-service"],
        "peak": {"cpu_pct": 96, "memory_pct": 70, "latency_ms": 6, "error_rate": 4},
        "action": "scale_up",
    },
    "memory_leak": {
        "applicable": ["auth-service", "user-service", "order-service", "payment-service",
                       "search-service", "inventory-service", "notification-service"],
        "peak": {"cpu_pct": 55, "memory_pct": 97, "latency_ms": 4, "error_rate": 3},
        "action": "restart_service",
    },
    "db_overload": {
        "applicable": ["primary-db", "data-warehouse"],
        "peak": {"cpu_pct": 92, "memory_pct": 88, "latency_ms": 45, "error_rate": 12, "disk_io_pct": 95},
        "action": "failover_to_replica",
    },
    "disk_io_saturation": {
        "applicable": ["primary-db", "data-warehouse"],
        "peak": {"cpu_pct": 60, "memory_pct": 65, "latency_ms": 30, "error_rate": 6, "disk_io_pct": 98},
        "action": "scale_up",
    },
    "cache_eviction": {
        "applicable": ["redis-cache"],
        "peak": {"cpu_pct": 70, "memory_pct": 90, "latency_ms": 15, "error_rate": 5},
        "action": "clear_cache",
    },
    "queue_backlog": {
        "applicable": ["message-queue"],
        "peak": {"cpu_pct": 65, "memory_pct": 80, "latency_ms": 20, "error_rate": 7},
        "action": "scale_up",
    },
    "network_latency": {
        "applicable": ["load-balancer", "api-gateway"],
        "peak": {"cpu_pct": 40, "memory_pct": 45, "latency_ms": 25, "error_rate": 6},
        "action": "rate_limit",
    },
    "external_timeout": {
        "applicable": ["payment-gateway", "email-provider"],
        "peak": {"cpu_pct": 30, "memory_pct": 35, "latency_ms": 60, "error_rate": 18},
        "action": "escalate_to_oncall",
    },
    "connection_pool_exhaustion": {
        "applicable": ["auth-service", "user-service", "order-service", "payment-service",
                       "search-service", "inventory-service", "primary-db"],
        "peak": {"cpu_pct": 50, "memory_pct": 55, "latency_ms": 18, "error_rate": 10},
        "action": "restart_service",
    },
    "security_brute_force": {
        "applicable": ["auth-service", "api-gateway"],
        "peak": {"cpu_pct": 45, "memory_pct": 40, "latency_ms": 8, "error_rate": 3},
        "action": "block_transaction",
    },
}
SEVERITIES = ["medium", "high", "critical"]
SEVERITY_MULT = {"medium": 0.55, "high": 0.8, "critical": 1.0}

# ─────────────────────────────────────────────────────────────────────────────
# Baselines (per-component "resting" values)
# ─────────────────────────────────────────────────────────────────────────────

BASELINE = {}
for c in COMPONENTS:
    cid = c["id"]
    tier = c["criticality"]
    base_load = {"critical": 0.55, "high": 0.45, "medium": 0.3, "low": 0.15}[tier]
    BASELINE[cid] = {
        "cpu_pct": 15 + base_load * 30 + random.uniform(-3, 3),
        "memory_pct": 25 + base_load * 25 + random.uniform(-3, 3),
        "latency_ms": {"Datastore": 8, "Cache": 1.5, "External": 180, "Network": 3}.get(c["kind"], 20) + random.uniform(-2, 2),
        "error_rate": 0.1 + random.uniform(0, 0.3),
        "throughput_rps": {"critical": 900, "high": 500, "medium": 250, "low": 80}[tier] + random.uniform(-20, 20),
        "disk_io_pct": (20 if c["kind"] == "Datastore" else 5) + random.uniform(-2, 2),
        "packet_loss_pct": 0.02 + random.uniform(0, 0.03),
        "bandwidth_util_pct": 20 + base_load * 30 + random.uniform(-3, 3),
        "connection_count": int({"critical": 400, "high": 250, "medium": 120, "low": 40}[tier] + random.uniform(-15, 15)),
    }

def diurnal_factor(dt):
    """Mild day/night traffic curve — peaks around 14:00 UTC, trough ~04:00 UTC."""
    hour = dt.hour + dt.minute / 60
    return 0.85 + 0.3 * math.sin((hour - 8) / 24 * 2 * math.pi)

# ─────────────────────────────────────────────────────────────────────────────
# Incident schedule
# ─────────────────────────────────────────────────────────────────────────────

def build_incidents(n=120, min_per_fault=10):
    """Schedule `n` incidents across the window.

    Two-phase construction:
      1. A deterministic (fault_type, component) schedule guaranteeing at
         least `min_per_fault` occurrences of every fault type — spread
         across whichever components that fault applies to — plus a few
         extra pinned payment-path hits so the infra-correlated transaction
         demo (retry-storm duplicates) always has something to attach to.
         Without this, a purely random draw tends to give most fault types
         zero or one occurrence, which is too few for outage_predictor.py's
         per-incident train/test split to learn a generalizable pattern
         instead of just memorizing individual ramps.
      2. Random fill up to `n` total from the full fault-type catalog.

    Each scheduled (fault_type, component) pair is then assigned a
    non-overlapping start offset (`min_gap_s` apart) within the window.
    """
    schedule = []
    for fault_type, spec in FAULT_TYPES.items():
        applicable = spec["applicable"]
        for i in range(min_per_fault):
            schedule.append((fault_type, applicable[i % len(applicable)]))

    # Extra guaranteed payment-path hits, on top of whatever min_per_fault
    # already placed there.
    schedule += [("connection_pool_exhaustion", "payment-service")] * 2
    schedule += [("external_timeout", "payment-gateway")] * 2

    while len(schedule) < n:
        fault_type = random.choice(list(FAULT_TYPES.keys()))
        component = random.choice(FAULT_TYPES[fault_type]["applicable"])
        schedule.append((fault_type, component))

    random.shuffle(schedule)

    total_seconds = int((END - START).total_seconds())
    min_gap_s = 45 * 60  # 45 min between incident starts
    starts_taken = []
    incidents = []
    for fault_type, component in schedule:
        offset_s = None
        for _ in range(300):
            candidate = random.randint(3600, total_seconds - 3600)
            if not any(abs(candidate - t) < min_gap_s for t in starts_taken):
                offset_s = candidate
                break
        if offset_s is None:
            continue  # window is full; drop rather than let incidents overlap
        starts_taken.append(offset_s)

        severity = random.choices(SEVERITIES, weights=[0.4, 0.4, 0.2])[0]

        ramp_s = random.randint(120, 300)      # 2–5 min gradual ramp-up
        hold_s = random.randint(120, 360)      # 2–6 min at full severity
        resolve_s = random.randint(90, 240)    # 1.5–4 min recovery

        start_dt = START + timedelta(seconds=offset_s)
        ramp_end = start_dt + timedelta(seconds=ramp_s)
        hold_end = ramp_end + timedelta(seconds=hold_s)
        end_dt = hold_end + timedelta(seconds=resolve_s)

        cascade = []
        for dep in dependents_of(component)[:2]:
            if random.random() < 0.6:
                delay_s = random.randint(30, 240)
                cascade.append({
                    "component": dep,
                    "delay_s": delay_s,
                    "magnitude": round(random.uniform(0.25, 0.5), 2),
                    "start": iso(start_dt + timedelta(seconds=delay_s)),
                    "end": iso(end_dt + timedelta(seconds=delay_s)),
                })

        incidents.append({
            "id": f"inc-{uuid.uuid4().hex[:8]}",
            "component": component,
            "fault_type": fault_type,
            "severity": severity,
            "pre_incident_window_start": iso(start_dt - timedelta(minutes=5)),
            "start_time": iso(start_dt),
            "ramp_end_time": iso(ramp_end),
            "hold_end_time": iso(hold_end),
            "end_time": iso(end_dt),
            "post_incident_window_end": iso(end_dt + timedelta(minutes=5)),
            "cascade": cascade,
            "description": f"{fault_type.replace('_', ' ')} on {component} ({severity})",
            "_start_dt": start_dt, "_ramp_end": ramp_end, "_hold_end": hold_end, "_end_dt": end_dt,
        })
    incidents.sort(key=lambda i: i["_start_dt"])
    return incidents

INCIDENTS = build_incidents(n=120, min_per_fault=10)

def parse_iso(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)

# For a given component, the list of (start_dt, ramp_end, hold_end, end_dt, fault_type, severity, magnitude)
# windows that affect it — either as the root cause or via cascade.
COMPONENT_EVENTS = {cid: [] for cid in COMPONENT_IDS}
for inc in INCIDENTS:
    COMPONENT_EVENTS[inc["component"]].append({
        "start": inc["_start_dt"], "ramp_end": inc["_ramp_end"], "hold_end": inc["_hold_end"], "end": inc["_end_dt"],
        "fault_type": inc["fault_type"], "severity": inc["severity"], "magnitude": 1.0, "incident_id": inc["id"],
    })
    for casc in inc["cascade"]:
        d = timedelta(seconds=casc["delay_s"])
        COMPONENT_EVENTS[casc["component"]].append({
            "start": inc["_start_dt"] + d, "ramp_end": inc["_ramp_end"] + d,
            "hold_end": inc["_hold_end"] + d, "end": inc["_end_dt"] + d,
            "fault_type": inc["fault_type"], "severity": inc["severity"],
            "magnitude": casc["magnitude"], "incident_id": inc["id"],
        })

def active_event(component_id, dt):
    """Return the event dict + severity progress s in [0,1] if dt falls in a dense window for this component."""
    for ev in COMPONENT_EVENTS[component_id]:
        dense_start = ev["start"] - timedelta(minutes=5)
        dense_end = ev["end"] + timedelta(minutes=5)
        if dense_start <= dt <= dense_end:
            if dt < ev["start"]:
                s = 0.0
            elif dt < ev["ramp_end"]:
                s = (dt - ev["start"]).total_seconds() / max(1, (ev["ramp_end"] - ev["start"]).total_seconds())
            elif dt < ev["hold_end"]:
                s = 1.0
            elif dt < ev["end"]:
                s = 1 - (dt - ev["hold_end"]).total_seconds() / max(1, (ev["end"] - ev["hold_end"]).total_seconds())
            else:
                s = 0.0
            s *= SEVERITY_MULT[ev["severity"]] * ev["magnitude"]
            return ev, max(0.0, min(1.0, s))
    return None, 0.0

# ─────────────────────────────────────────────────────────────────────────────
# Metric value synthesis
# ─────────────────────────────────────────────────────────────────────────────

def metric_row(component_id, dt):
    base = BASELINE[component_id]
    dfac = diurnal_factor(dt)
    ev, s = active_event(component_id, dt)

    cpu = base["cpu_pct"] * dfac
    mem = base["memory_pct"]
    lat = base["latency_ms"] * (0.9 + 0.2 * dfac)
    err = base["error_rate"]
    thr = base["throughput_rps"] * dfac
    disk = base["disk_io_pct"]

    if ev and s > 0:
        peak = FAULT_TYPES[ev["fault_type"]]["peak"]
        cpu += (peak.get("cpu_pct", cpu) - cpu) * s
        mem += (peak.get("memory_pct", mem) - mem) * s
        lat += (lat * peak.get("latency_ms", 3) - lat) * s
        err += peak.get("error_rate", 0) * s
        disk += (peak.get("disk_io_pct", disk) - disk) * s
        thr *= max(0.3, 1 - 0.5 * s)

    jitter = lambda v, pct: v * (1 + random.uniform(-pct, pct))
    return {
        "timestamp": iso(dt),
        "component_id": component_id,
        "cpu_pct": round(max(0, min(100, jitter(cpu, 0.05))), 2),
        "memory_pct": round(max(0, min(100, jitter(mem, 0.04))), 2),
        "latency_ms": round(max(0.1, jitter(lat, 0.08)), 2),
        "error_rate_pct": round(max(0, jitter(err, 0.1)), 3),
        "throughput_rps": round(max(0, jitter(thr, 0.06)), 1),
        "disk_io_pct": round(max(0, min(100, jitter(disk, 0.06))), 2),
    }

def network_row(component_id, dt):
    base = BASELINE[component_id]
    dfac = diurnal_factor(dt)
    ev, s = active_event(component_id, dt)

    packet_loss = base["packet_loss_pct"]
    bandwidth = base["bandwidth_util_pct"] * dfac
    conns = base["connection_count"] * dfac
    lat = base["latency_ms"] * 0.4

    if ev and s > 0 and ev["fault_type"] in ("network_latency", "queue_backlog", "external_timeout", "db_overload"):
        packet_loss += s * random.uniform(2, 8)
        bandwidth += (95 - bandwidth) * s * 0.6
        lat += lat * s * 4
        conns *= max(0.4, 1 - 0.3 * s)

    jitter = lambda v, pct: v * (1 + random.uniform(-pct, pct))
    return {
        "timestamp": iso(dt),
        "component_id": component_id,
        "packet_loss_pct": round(max(0, jitter(packet_loss, 0.15)), 3),
        "bandwidth_util_pct": round(max(0, min(100, jitter(bandwidth, 0.06))), 2),
        "connection_count": int(max(0, jitter(conns, 0.08))),
        "inter_node_latency_ms": round(max(0.1, jitter(lat, 0.1)), 2),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Sampling loop — baseline sparse pass + dense incident-window pass
# ─────────────────────────────────────────────────────────────────────────────

def generate_metrics():
    infra_rows = []
    net_rows = []

    for cid in COMPONENT_IDS:
        dense_windows = [(ev["start"] - timedelta(minutes=5), ev["end"] + timedelta(minutes=5), ev)
                          for ev in COMPONENT_EVENTS[cid]]

        def in_dense(dt):
            return any(a <= dt <= b for a, b, _ in dense_windows)

        # Baseline pass, skipping timestamps inside dense windows. Sampled at a
        # ~15s scrape interval (Prometheus-typical) rather than 30-60s: the ML
        # layer's rolling-window features (outage_predictor.py, default
        # window_s=30) need several real samples per window everywhere, not
        # just inside incident regions — a coarser baseline interval left most
        # negative-class windows with a single degenerate sample (std=0),
        # which the classifier could exploit as a "dense region" shortcut
        # instead of learning genuine pre-failure shape.
        t = START
        while t <= END:
            if not in_dense(t):
                infra_rows.append(metric_row(cid, t))
                net_rows.append(network_row(cid, t))
            t += timedelta(seconds=random.randint(10, 20))

        # dense pass for each incident window touching this component: the ±5min
        # lead-up/aftermath buffer and the ramp/resolve edges run at 1 Hz (this is
        # the part with real predictive signal); the steady-state hold plateau is
        # sampled every 5s since it carries little extra information once it's flat.
        for a, b, ev in dense_windows:
            a = max(a, START)
            b = min(b, END)
            t = a
            while t <= b:
                infra_rows.append(metric_row(cid, t))
                net_rows.append(network_row(cid, t))
                t += timedelta(seconds=1)

    infra_rows.sort(key=lambda r: (r["component_id"], r["timestamp"]))
    net_rows.sort(key=lambda r: (r["component_id"], r["timestamp"]))
    return infra_rows, net_rows

# ─────────────────────────────────────────────────────────────────────────────
# Security events
# ─────────────────────────────────────────────────────────────────────────────

SECURITY_EVENT_TYPES = ["failed_login", "unusual_access_pattern", "firewall_alert", "privilege_change"]

def generate_security_events():
    events = []
    for cid in COMPONENT_IDS:
        t = START
        while t <= END:
            ev, s = active_event(cid, t)
            base_prob = 0.015
            if ev and ev["fault_type"] == "security_brute_force" and s > 0:
                prob = base_prob + s * 0.9
                event_type = "failed_login" if random.random() < 0.8 else "unusual_access_pattern"
            else:
                prob = base_prob
                event_type = random.choices(SECURITY_EVENT_TYPES, weights=[0.6, 0.2, 0.15, 0.05])[0]

            if random.random() < prob:
                severity = "critical" if (ev and s > 0.7) else random.choices(
                    ["low", "medium", "high"], weights=[0.6, 0.3, 0.1])[0]
                events.append({
                    "id": f"sec-{uuid.uuid4().hex[:10]}",
                    "timestamp": iso(t),
                    "component_id": cid,
                    "event_type": event_type,
                    "severity": severity,
                    "source_ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                    "incident_id": ev["incident_id"] if (ev and s > 0) else None,
                })
            t += timedelta(seconds=random.randint(30, 90))
    events.sort(key=lambda e: e["timestamp"])
    return events

# ─────────────────────────────────────────────────────────────────────────────
# Application logs
# ─────────────────────────────────────────────────────────────────────────────

ERROR_MSGS = [
    lambda c: f"Connection timeout to {c} after 30s",
    lambda c: f"Failed to acquire DB connection from pool in {c}",
    lambda c: f"HTTP 503 Service Unavailable — {c} not responding",
    lambda c: f"Circuit breaker OPEN for {c} — blocking requests",
    lambda c: f"Memory limit exceeded (OOMKilled) in {c} pod",
    lambda c: f"Retry limit reached (5/5) calling {c}",
    lambda c: f"Deadlock detected in {c} DB transaction",
]
WARN_MSGS = [
    lambda c: f"High latency detected on {c}: P99 elevated",
    lambda c: f"{c} response time degraded — above baseline",
    lambda c: f"{c} queue depth approaching limit",
    lambda c: f"Cache miss rate elevated in {c}",
    lambda c: f"{c} CPU utilization high — scaling in progress",
    lambda c: f"Slow query in {c}",
]
INFO_MSGS = [
    lambda c: f"{c} health check passed — all probes green",
    lambda c: f"New connection established to {c}",
    lambda c: f"{c} processed batch successfully",
    lambda c: f"{c} config reload successful",
    lambda c: f"{c} metrics flushed to collector",
]

def generate_logs():
    logs = []
    for cid in COMPONENT_IDS:
        t = START
        while t <= END:
            ev, s = active_event(cid, t)
            baseline_prob = 0.006
            if ev and s > 0:
                prob = baseline_prob + s * 0.35
                severity = "error" if s > 0.5 else "warn"
            else:
                prob = baseline_prob
                severity = random.choices(["error", "warn", "info"], weights=[0.1, 0.2, 0.7])[0]

            if random.random() < prob:
                msg_pool = {"error": ERROR_MSGS, "warn": WARN_MSGS, "info": INFO_MSGS}[severity]
                logs.append({
                    "id": f"log-{uuid.uuid4().hex[:10]}",
                    "timestamp": iso(t),
                    "component_id": cid,
                    "severity": severity,
                    "message": random.choice(msg_pool)(cid),
                    "incident_id": ev["incident_id"] if (ev and s > 0) else None,
                    "trace_id": uuid.uuid4().hex[:8],
                    "span_id": uuid.uuid4().hex[:6],
                })
            t += timedelta(seconds=random.randint(20, 45))
    logs.sort(key=lambda l: l["timestamp"])
    return logs

# ─────────────────────────────────────────────────────────────────────────────
# Financial transactions
# ─────────────────────────────────────────────────────────────────────────────

ACCOUNTS_INTERNAL = ['ACC-0042', 'ACC-1187', 'ACC-2291', 'ACC-3354', 'ACC-4480',
                     'ACC-5512', 'ACC-6673', 'ACC-7701', 'ACC-8834', 'ACC-9902']
ACCOUNTS_EXTERNAL = ['EXT-US-883', 'EXT-EU-291', 'EXT-APAC-47', 'EXT-LATAM-16',
                     'MERCH-AMZN', 'MERCH-STRIPE', 'MERCH-PAYPAL', 'MERCH-SHOPIFY']
TX_TYPES = ['wire_transfer', 'ach_payment', 'card_charge', 'refund', 'inter_account',
            'crypto_withdrawal', 'p2p_transfer']
PAYMENT_COMPONENTS = ["payment-service", "payment-gateway", "order-service"]

def account_history():
    return {acc: {"avg_amount": random.uniform(80, 900), "tx_count": 0} for acc in ACCOUNTS_INTERNAL}

def generate_transactions(hist):
    txs = []
    t = START
    while t <= END:
        # background transaction arrivals: ~ one every 90-260s across all accounts
        t += timedelta(seconds=random.randint(90, 260))
        if t > END:
            break
        src = random.choice(ACCOUNTS_INTERNAL)
        dst_pool = ACCOUNTS_INTERNAL if random.random() < 0.55 else ACCOUNTS_EXTERNAL
        dst = random.choice(dst_pool)
        while dst == src:
            dst = random.choice(dst_pool)

        avg = hist[src]["avg_amount"]
        amount = round(max(1, random.gauss(avg, avg * 0.4)), 2)
        tx_type = random.choice(TX_TYPES)
        hist[src]["tx_count"] += 1

        component = random.choice(PAYMENT_COMPONENTS)
        is_fraud = False
        anomaly_type = None

        # True fraud: rare, and only PARTIALLY separable by amount alone — a
        # classifier that only learns "big amount = fraud" would be trivially
        # accurate on unrealistic data but useless in practice. Three patterns,
        # each leaning on a different feature the fraud model actually computes
        # (amount_z, dest_is_new, seconds_since_last):
        if random.random() < 0.03:
            is_fraud = True
            pattern = random.choices(
                ["large_transfer", "small_test", "structuring_burst"],
                weights=[0.5, 0.25, 0.25],
            )[0]
            # A genuinely fresh destination ID, not drawn from the small,
            # already-exhausted ACCOUNTS_EXTERNAL pool. With only 18 total
            # accounts shared by 10 sources, every (src, dst) pair gets used
            # at least once within the first ~200 transactions — long before
            # fraud starts appearing later in the timeline — so reusing that
            # pool made "new destination" a dead feature (measured: fraud
            # hit an unseen pair *less* often than legit traffic, 3.5% vs
            # 4.9%). Real fraud/money-mule payouts go to disposable,
            # never-seen-before accounts, which this now actually models.
            new_dst = f"EXT-{random.choice(['US', 'EU', 'APAC', 'LATAM'])}-{uuid.uuid4().hex[:6].upper()}"

            if pattern == "large_transfer":
                # Still amount-driven, but a lower multiplier than before so
                # the upper tail overlaps high-average accounts' normal range
                # instead of sitting in a completely separate band.
                anomaly_type = "fraud_large_transfer"
                amount = round(avg * random.uniform(3, 12), 2)
                dst = new_dst
                tx_type = random.choice(["wire_transfer", "crypto_withdrawal"])
            elif pattern == "small_test":
                # Card-testing / account-takeover probe: a small charge to a
                # brand-new destination — amount alone looks completely normal.
                anomaly_type = "fraud_small_test"
                amount = round(random.uniform(1, 15), 2)
                dst = new_dst
                tx_type = "card_charge"
            else:
                # Structuring: 2-4 near-baseline-sized transfers to the same
                # new destination in rapid succession. Amount matches the
                # account's own history; the tell is velocity + destination
                # novelty, not size.
                anomaly_type = "fraud_structuring"
                amount = round(avg * random.uniform(0.7, 1.4), 2)
                dst = new_dst
                tx_type = random.choice(["ach_payment", "p2p_transfer"])
                for _ in range(random.randint(1, 3)):
                    t += timedelta(seconds=random.randint(5, 30))
                    burst_amount = round(avg * random.uniform(0.7, 1.4), 2)
                    txs.append({
                        "id": f"tx-{uuid.uuid4().hex[:10]}", "timestamp": iso(t),
                        "amount": burst_amount, "currency": "USD", "type": tx_type,
                        "src": src, "dst": dst, "component_id": component,
                        "is_fraud": True, "anomaly_type": anomaly_type,
                        "incident_id": None,
                    })

        # infra-correlated anomaly: duplicate/retry-storm charges while a payment-path incident is active
        ev, s = active_event(component, t)
        if not is_fraud and ev and s > 0.4 and component in ("payment-service", "payment-gateway"):
            if random.random() < 0.3:
                anomaly_type = "infra_retry_duplicate"
                dup = dict(amount=amount, currency="USD", type=tx_type, src=src, dst=dst)
                txs.append({
                    "id": f"tx-{uuid.uuid4().hex[:10]}", "timestamp": iso(t), **dup,
                    "component_id": component, "is_fraud": False, "anomaly_type": anomaly_type,
                    "incident_id": ev["incident_id"],
                })
                t += timedelta(seconds=random.randint(1, 4))  # the "duplicate" retry fires almost immediately

        txs.append({
            "id": f"tx-{uuid.uuid4().hex[:10]}",
            "timestamp": iso(t),
            "amount": amount,
            "currency": "USD",
            "type": tx_type,
            "src": src,
            "dst": dst,
            "component_id": component,
            "is_fraud": is_fraud,
            "anomaly_type": anomaly_type,
            "incident_id": ev["incident_id"] if (ev and s > 0.4 and anomaly_type == "infra_retry_duplicate") else None,
        })
    txs.sort(key=lambda x: x["timestamp"])
    return txs

# ─────────────────────────────────────────────────────────────────────────────
# Remediation log
# ─────────────────────────────────────────────────────────────────────────────

def generate_remediation_log():
    records = []
    for inc in INCIDENTS:
        fault = FAULT_TYPES[inc["fault_type"]]
        resolved = random.random() < 0.9
        ttr = int((inc["_end_dt"] - inc["_start_dt"]).total_seconds()) + random.randint(-60, 180)
        records.append({
            "id": f"rem-{uuid.uuid4().hex[:8]}",
            "incident_id": inc["id"],
            "component_id": inc["component"],
            "action": fault["action"],
            "resolved": resolved,
            "time_to_resolution_s": max(30, ttr),
            "notes": f"Auto-detected {inc['fault_type'].replace('_', ' ')}; "
                     f"applied '{fault['action']}'"
                     + ("." if resolved else "; required manual follow-up."),
        })
    return records

# ─────────────────────────────────────────────────────────────────────────────
# Write-out
# ─────────────────────────────────────────────────────────────────────────────

def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

def main():
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(out_dir, exist_ok=True)

    topology = {
        "components": COMPONENTS,
        "dependencies": [{"source": s, "target": t} for s, t in EDGES],
        "generated_at": iso(datetime.now(timezone.utc)),
    }
    write_json(os.path.join(out_dir, "topology.json"), topology)

    infra_rows, net_rows = generate_metrics()
    write_csv(os.path.join(out_dir, "infra_metrics.csv"), infra_rows,
              ["timestamp", "component_id", "cpu_pct", "memory_pct", "latency_ms",
               "error_rate_pct", "throughput_rps", "disk_io_pct"])
    write_csv(os.path.join(out_dir, "network_metrics.csv"), net_rows,
              ["timestamp", "component_id", "packet_loss_pct", "bandwidth_util_pct",
               "connection_count", "inter_node_latency_ms"])

    security_events = generate_security_events()
    write_json(os.path.join(out_dir, "security_events.json"), security_events)

    logs = generate_logs()
    write_json(os.path.join(out_dir, "app_logs.json"), logs)

    hist = account_history()
    txs = generate_transactions(hist)
    write_csv(os.path.join(out_dir, "transactions.csv"), txs,
              ["id", "timestamp", "amount", "currency", "type", "src", "dst",
               "component_id", "is_fraud", "anomaly_type", "incident_id"])

    incidents_out = [{k: v for k, v in inc.items() if not k.startswith("_")} for inc in INCIDENTS]
    write_json(os.path.join(out_dir, "incidents.json"), incidents_out)

    remediation = generate_remediation_log()
    write_json(os.path.join(out_dir, "remediation_log.json"), remediation)

    fault_type_counts = Counter(inc["fault_type"] for inc in INCIDENTS)
    fraud_type_counts = Counter(x["anomaly_type"] for x in txs if x["is_fraud"])

    print("=== Synthetic data generation summary ===")
    print(f"Window:              {iso(START)} -> {iso(END)}  ({SIM_HOURS}h)")
    print(f"Components:          {len(COMPONENTS)}")
    print(f"Incidents injected:  {len(INCIDENTS)}  (per fault type: {dict(fault_type_counts)})")
    print(f"infra_metrics.csv:   {len(infra_rows):>8,} rows")
    print(f"network_metrics.csv: {len(net_rows):>8,} rows")
    print(f"security_events.json:{len(security_events):>8,} records")
    print(f"app_logs.json:       {len(logs):>8,} records")
    print(f"transactions.csv:    {len(txs):>8,} rows  (fraud={sum(1 for x in txs if x['is_fraud'])}, "
          f"by pattern: {dict(fraud_type_counts)}, "
          f"infra_retry_duplicate={sum(1 for x in txs if x['anomaly_type']=='infra_retry_duplicate')})")
    print(f"incidents.json:      {len(incidents_out):>8,} records")
    print(f"remediation_log.json:{len(remediation):>8,} records")
    total = len(infra_rows) + len(net_rows) + len(security_events) + len(logs) + len(txs) + len(incidents_out) + len(remediation)
    print(f"TOTAL rows/records:  {total:>8,}")

if __name__ == "__main__":
    main()
