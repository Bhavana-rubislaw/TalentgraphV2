#!/usr/bin/env python3
"""
API smoke pass: meetings, applications, notifications key routes.

Category:     testing
Idempotent:   yes (read-only requests against unauthenticated client)
Run:          python backend2/scripts/testing/smoke_api.py
Rollback:     N/A (no state mutated)
Dependencies: none beyond the app's own import graph — uses FastAPI's
              TestClient in-process, no live server or DB connection
              required for the checks below (all hit auth/health checks
              that short-circuit before any DB access).

Confirms the app imports and its routers wire up correctly under the
current dependency pins (this is the concrete "can you actually run the
app" check that a bare requirements.txt bump doesn't verify by itself).
Each route is checked for the status code it should return with no
Authorization header - a 401 (or a plain 200 for /health) means routing
and dependency injection are intact; a 500 means something is actually
broken.
"""
import sys
from pathlib import Path

# Allow running from the backend2 root: python scripts/testing/smoke_api.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CHECKS = [
    ("GET", "/health", 200),
    ("GET", "/meetings/list", 401),           # unauthenticated -> expect 401, not 500
    ("GET", "/applications/my-applications", 401),
    ("GET", "/notifications", 401),
]


def main():
    failures = []
    for method, path, expected in CHECKS:
        resp = client.request(method, path)
        ok = resp.status_code == expected
        status = "OK" if ok else "FAIL"
        if not ok:
            failures.append((method, path, expected, resp.status_code))
        print(f"[{status}] {method} {path} -> {resp.status_code} (expected {expected})")
    if failures:
        raise SystemExit(f"{len(failures)} smoke check(s) failed")
    print(f"\nAll {len(CHECKS)} smoke checks passed.")


if __name__ == "__main__":
    main()
