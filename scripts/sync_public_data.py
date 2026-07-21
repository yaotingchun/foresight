"""
Reduces the canonical /data output (Part 2) into the small set of JSON files
the React app actually fetches at runtime, written to public/data/ so Vite
serves them as static assets.

/data stays the full-resolution dataset (CSV for numeric time series, per the
Part 2 spec); public/data/ is a derived, browser-sized view of it:

  topology.json        - passthrough (components + dependencies)
  incidents.json        - passthrough (ground-truth fault windows)
  app_logs.json         - passthrough (already small)
  transactions.json     - transactions.csv parsed + typed
  service_health.json   - per-component latest reading + sparkline + uptime,
                           reduced from the 88k-row infra_metrics.csv so the
                           browser isn't asked to fetch/parse the whole thing

Run this after generate_synthetic_data.py, any time /data changes.
"""

import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
PUBLIC_DIR = os.path.join(ROOT, "public", "data")

SPARK_POINTS = 16
# error-rate / latency thresholds used to classify a component's current health
WARN_ERROR_PCT, CRIT_ERROR_PCT = 2.0, 6.0


def load_json(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def write_public_json(name, obj):
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    with open(os.path.join(PUBLIC_DIR, name), "w", encoding="utf-8") as f:
        json.dump(obj, f)


def coerce(row):
    out = {}
    for k, v in row.items():
        if v in ("True", "False"):
            out[k] = v == "True"
            continue
        try:
            out[k] = int(v)
            continue
        except ValueError:
            pass
        try:
            out[k] = float(v)
            continue
        except ValueError:
            pass
        out[k] = v if v != "" else None
    return out


def sync_transactions():
    path = os.path.join(DATA_DIR, "transactions.csv")
    with open(path, newline="", encoding="utf-8") as f:
        rows = [coerce(row) for row in csv.DictReader(f)]
    write_public_json("transactions.json", rows)
    return len(rows)


def sync_service_health():
    path = os.path.join(DATA_DIR, "infra_metrics.csv")
    per_component = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cid = row["component_id"]
            per_component.setdefault(cid, []).append(row)

    health_by_component = {}
    for cid, rows in per_component.items():
        rows.sort(key=lambda r: r["timestamp"])
        latest = rows[-1]
        cpu = float(latest["cpu_pct"])
        err = float(latest["error_rate_pct"])
        latency = float(latest["latency_ms"])
        rps = float(latest["throughput_rps"])

        if err >= CRIT_ERROR_PCT or cpu >= 95:
            health = "critical"
        elif err >= WARN_ERROR_PCT or cpu >= 85:
            health = "warning"
        else:
            health = "healthy"

        healthy_samples = sum(1 for r in rows if float(r["error_rate_pct"]) < WARN_ERROR_PCT)
        uptime = round(100 * healthy_samples / len(rows), 2)

        spark = [round(float(r["throughput_rps"]), 1) for r in rows[-SPARK_POINTS:]]

        health_by_component[cid] = {
            "id": cid,
            "health": health,
            "metrics": {
                "rps": round(rps),
                "latency": round(latency, 1),
                "errorRate": round(err, 2),
                "uptime": uptime,
                "spark": spark,
            },
        }

    write_public_json("service_health.json", health_by_component)
    return len(health_by_component)


def main():
    topo = load_json("topology.json")
    write_public_json("topology.json", topo)

    incidents = load_json("incidents.json")
    write_public_json("incidents.json", incidents)

    logs = load_json("app_logs.json")
    write_public_json("app_logs.json", logs)

    tx_count = sync_transactions()
    comp_count = sync_service_health()

    print("=== public/data sync summary ===")
    print(f"topology.json:        {len(topo['components'])} components, {len(topo['dependencies'])} deps")
    print(f"incidents.json:       {len(incidents)} records")
    print(f"app_logs.json:        {len(logs)} records")
    print(f"transactions.json:    {tx_count} records")
    print(f"service_health.json:  {comp_count} components")


if __name__ == "__main__":
    main()
