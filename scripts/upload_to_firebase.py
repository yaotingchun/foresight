"""
Part 3 — one-time batch upload of the local /data files to Firestore.

Reads the CSV/JSON files produced by generate_synthetic_data.py and writes
them to Firestore, one collection per file, using the Firebase Admin SDK.
Credentials are loaded from an environment variable — never hardcoded and
never committed.

Setup:
    Set FIREBASE_CREDENTIALS_PATH to the path of your service-account JSON
    (e.g. credentials/firebase.json), or set FIREBASE_CREDENTIALS_JSON to the
    full JSON contents directly (useful in CI where you can't drop a file).

Usage:
    python scripts/upload_to_firebase.py --dry-run   # preview only, no writes
    python scripts/upload_to_firebase.py              # actually upload
    python scripts/upload_to_firebase.py --only transactions,incidents
"""

import argparse
import csv
import json
import os
import sys

BATCH_SIZE = 500
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# file -> (Firestore collection name, id field to use as document id, is_csv)
FILE_MAP = {
    "topology.json":        ("topology_components", None, False),  # special-cased below (nested doc)
    "infra_metrics.csv":    ("infra_metrics", None, True),
    "network_metrics.csv":  ("network_metrics", None, True),
    "security_events.json": ("security_events", "id", False),
    "app_logs.json":        ("app_logs", "id", False),
    "transactions.csv":     ("transactions", "id", True),
    "incidents.json":       ("incidents", "id", False),
    "remediation_log.json": ("remediation_log", "id", False),
}


def load_records(filename, is_csv):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    if is_csv:
        with open(path, newline="", encoding="utf-8") as f:
            return [dict(row) for row in csv.DictReader(f)]
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def coerce_types(row):
    """CSV rows come back as all-strings; cast the numeric/boolean fields back."""
    out = {}
    for k, v in row.items():
        if v is None:
            out[k] = None
            continue
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


def get_credentials():
    cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")

    import firebase_admin
    from firebase_admin import credentials

    if cred_json:
        cred = credentials.Certificate(json.loads(cred_json))
    elif cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        print("ERROR: set FIREBASE_CREDENTIALS_PATH (path to service-account json) "
              "or FIREBASE_CREDENTIALS_JSON (the json contents) in the environment.",
              file=sys.stderr)
        sys.exit(1)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    return firebase_admin


def upload_collection(db, collection_name, records, id_field, is_csv, dry_run):
    if not records:
        print(f"  {collection_name}: 0 records, skipping")
        return 0

    if dry_run:
        print(f"  {collection_name}: would write {len(records)} records "
              f"(sample keys: {list(records[0].keys())})")
        return len(records)

    written = 0
    coll_ref = db.collection(collection_name)
    for i in range(0, len(records), BATCH_SIZE):
        chunk = records[i:i + BATCH_SIZE]
        wb = db.batch()
        for rec in chunk:
            data = coerce_types(rec) if is_csv else rec
            doc_id = str(rec[id_field]) if id_field and rec.get(id_field) else coll_ref.document().id
            wb.set(coll_ref.document(doc_id), data)
        wb.commit()
        written += len(chunk)
        print(f"  {collection_name}: wrote batch {i // BATCH_SIZE + 1} "
              f"({written}/{len(records)})")
    return written


def upload_topology(db, dry_run):
    path = os.path.join(DATA_DIR, "topology.json")
    if not os.path.exists(path):
        print("  topology: file not found, skipping")
        return 0
    with open(path, encoding="utf-8") as f:
        topo = json.load(f)

    total = len(topo.get("components", [])) + len(topo.get("dependencies", []))
    if dry_run:
        print(f"  topology_components: would write {len(topo.get('components', []))} records")
        print(f"  topology_dependencies: would write {len(topo.get('dependencies', []))} records")
        return total

    comp_ref = db.collection("topology_components")
    wb = db.batch()
    for c in topo.get("components", []):
        wb.set(comp_ref.document(c["id"]), c)
    wb.commit()
    print(f"  topology_components: wrote {len(topo.get('components', []))} records")

    dep_ref = db.collection("topology_dependencies")
    deps = topo.get("dependencies", [])
    for i in range(0, len(deps), BATCH_SIZE):
        chunk = deps[i:i + BATCH_SIZE]
        wb = db.batch()
        for d in chunk:
            doc_id = f"{d['source']}__{d['target']}"
            wb.set(dep_ref.document(doc_id), d)
        wb.commit()
    print(f"  topology_dependencies: wrote {len(deps)} records")
    return total


def main():
    parser = argparse.ArgumentParser(description="Upload local /data files to Firestore.")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be uploaded, write nothing.")
    parser.add_argument("--only", type=str, default=None,
                         help="Comma-separated subset of collection names to upload (e.g. transactions,incidents).")
    args = parser.parse_args()

    only = set(s.strip() for s in args.only.split(",")) if args.only else None

    db = None
    if not args.dry_run:
        firebase_admin = get_credentials()
        from firebase_admin import firestore
        db = firestore.client()

    print(f"{'DRY RUN - ' if args.dry_run else ''}Uploading from {DATA_DIR}")
    total_written = 0

    if only is None or "topology_components" in only or "topology_dependencies" in only:
        total_written += upload_topology(db, args.dry_run)

    for filename, (collection_name, id_field, is_csv) in FILE_MAP.items():
        if filename == "topology.json":
            continue
        if only is not None and collection_name not in only:
            continue
        records = load_records(filename, is_csv)
        total_written += upload_collection(db, collection_name, records, id_field, is_csv, args.dry_run)

    print(f"\n{'Would write' if args.dry_run else 'Wrote'} {total_written:,} total records.")


if __name__ == "__main__":
    main()
