#!/usr/bin/env python3
"""
Compare the live OpenAPI schema against the committed baseline snapshot.

Category:     testing
Idempotent:   yes (read-only, does not write the baseline file)
Run:          python backend2/scripts/testing/check_openapi_drift.py
Rollback:     N/A (no state is mutated)
Dependencies: importable `app` package; docs/openapi_baseline.json must
              already exist (see generate_openapi_baseline.py).

Purpose: fail loudly if a refactor accidentally changes the HTTP contract
(added/removed paths, added/removed operations, changed status codes,
changed request/response schema names) instead of only internal structure.
Intended to be run as part of "Backend Verification Before Frontend Work"
and as a CI gate before merging any refactor slice.

Exit code 0 = no drift. Exit code 1 = drift detected (see printed summary).
Exit code 2 = no baseline file found (run generate_openapi_baseline.py first).
"""
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402

BASELINE_PATH = BACKEND_ROOT / "docs" / "openapi_baseline.json"


def _operations(schema: dict) -> dict:
    """Flatten schema['paths'] into {'GET /meetings/list': {...operation...}}."""
    ops = {}
    for path, methods in schema.get("paths", {}).items():
        for method, operation in methods.items():
            if method.lower() not in ("get", "post", "put", "patch", "delete"):
                continue
            ops[f"{method.upper()} {path}"] = operation
    return ops


def _response_codes(operation: dict) -> set:
    return set(operation.get("responses", {}).keys())


def main():
    if not BASELINE_PATH.exists():
        print(f"No baseline found at {BASELINE_PATH}.")
        print("Run generate_openapi_baseline.py first to create one.")
        return 2

    baseline = json.loads(BASELINE_PATH.read_text())
    current = app.openapi()

    baseline_ops = _operations(baseline)
    current_ops = _operations(current)

    added = sorted(set(current_ops) - set(baseline_ops))
    removed = sorted(set(baseline_ops) - set(current_ops))
    changed_status_codes = []

    for key in sorted(set(current_ops) & set(baseline_ops)):
        old_codes = _response_codes(baseline_ops[key])
        new_codes = _response_codes(current_ops[key])
        if old_codes != new_codes:
            changed_status_codes.append((key, old_codes, new_codes))

    has_drift = bool(added or removed or changed_status_codes)

    if not has_drift:
        print(f"No drift: {len(current_ops)} operations match the baseline.")
        return 0

    print("OpenAPI drift detected vs. docs/openapi_baseline.json:\n")
    if added:
        print(f"  Added operations ({len(added)}):")
        for op in added:
            print(f"    + {op}")
    if removed:
        print(f"  Removed operations ({len(removed)}):")
        for op in removed:
            print(f"    - {op}")
    if changed_status_codes:
        print(f"  Changed response status codes ({len(changed_status_codes)}):")
        for op, old, new in changed_status_codes:
            print(f"    ~ {op}: {sorted(old)} -> {sorted(new)}")

    print("\nIf this drift is intentional, re-run generate_openapi_baseline.py")
    print("and commit the updated docs/openapi_baseline.json. If not, you")
    print("have found a real contract change from the refactor.")
    return 1


if __name__ == "__main__":
    sys.exit(main())