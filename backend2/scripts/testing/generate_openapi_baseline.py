#!/usr/bin/env python3
"""
Generate the committed OpenAPI baseline snapshot from the live app schema.

Category:     testing
Idempotent:   yes (overwrites the same output file deterministically)
Run:          python backend2/scripts/testing/generate_openapi_baseline.py
Rollback:     git checkout -- backend2/docs/openapi_baseline.json
Dependencies: importable `app` package (requires the requirements.txt
              pydantic v2 upgrade to be applied first).

Purpose: produce backend2/docs/openapi_baseline.json, a snapshot of
app.openapi() used by check_openapi_drift.py to catch accidental contract
changes (new/removed routes, changed status codes, changed schemas) during
refactors that are supposed to be behavior-preserving.

Usage:
  1. First time / intentional contract change: run this script, review the
     diff of docs/openapi_baseline.json in git, commit it.
  2. Routine verification: do NOT run this script — run
     check_openapi_drift.py instead, which compares the live schema against
     the committed baseline WITHOUT overwriting it.
"""
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402

OUTPUT_PATH = BACKEND_ROOT / "docs" / "openapi_baseline.json"


def main():
    schema = app.openapi()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    route_count = len(schema.get("paths", {}))
    print(f"Wrote {OUTPUT_PATH.relative_to(BACKEND_ROOT.parent)} ({route_count} paths)")
    print("Review the diff before committing — this is your new baseline.")


if __name__ == "__main__":
    main()