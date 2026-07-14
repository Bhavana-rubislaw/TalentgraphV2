# #!/usr/bin/env python3
# """
# API smoke pass: meetings, applications, notifications key routes.

# Category:     testing
# Idempotent:   yes (read-only checks, no DB writes)
# Run:          python backend2/scripts/testing/smoke_api.py
# Rollback:     N/A (no state is mutated)
# Dependencies: importable `app` package (i.e. the requirements.txt pydantic v2
#               upgrade must be applied first); no live server or DB connection
#               required — uses FastAPI's in-process TestClient.

# Purpose: fast, no-DB sanity check that the meetings/applications/notifications
# routers still mount correctly and reject unauthenticated requests the same
# way after the service-layer extraction (Phase 1/2 refactor). This is NOT a
# substitute for the pytest suite — it only checks that routes exist, are
# wired to the app, and enforce auth. Add authenticated checks (see bottom)
# once you have a way to mint a test JWT via this repo's existing test
# fixtures.
# """
# import sys
# from pathlib import Path

# # Allow running as `python backend2/scripts/testing/smoke_api.py` from repo root.
# BACKEND_ROOT = Path(__file__).resolve().parents[2]
# sys.path.insert(0, str(BACKEND_ROOT))

# from fastapi.testclient import TestClient  # noqa: E402
# from app.main import app  # noqa: E402

# client = TestClient(app)

# # (method, path, expected_status, description)
# UNAUTHENTICATED_CHECKS = [
#     ("GET", "/health", 200, "liveness check"),
#     ("GET", "/meetings/list", 401, "meetings list requires auth"),
#     ("GET", "/meetings/availability/my-slots", 401, "availability slots require auth"),
#     ("GET", "/applications/my-applications", 401, "applications list requires auth"),
#     ("GET", "/notifications", 401, "notifications list requires auth"),
#     ("GET", "/notifications/unread-count", 401, "unread count requires auth"),
# ]


# def run_checks(checks):
#     failures = []
#     for method, path, expected, description in checks:
#         resp = client.request(method, path)
#         ok = resp.status_code == expected
#         status = "OK" if ok else "FAIL"
#         print(f"[{status}] {method:4s} {path:40s} -> {resp.status_code} (expected {expected}) — {description}")
#         if not ok:
#             failures.append((method, path, expected, resp.status_code, description))
#     return failures


# def main():
#     print(f"Smoke testing app: {app.title}\n")
#     failures = run_checks(UNAUTHENTICATED_CHECKS)

#     print()
#     if failures:
#         print(f"{len(failures)} smoke check(s) FAILED:")
#         for method, path, expected, actual, description in failures:
#             print(f"  - {method} {path}: expected {expected}, got {actual} ({description})")
#         raise SystemExit(1)

#     print(f"All {len(UNAUTHENTICATED_CHECKS)} smoke checks passed.")


# if __name__ == "__main__":
#     main()
#!/usr/bin/env python3
"""
API smoke pass: meetings, applications, notifications key routes.

Category:     testing
Idempotent:   yes (read-only checks, no DB writes)
Run:          python backend2/scripts/testing/smoke_api.py
Rollback:     N/A (no state is mutated)
Dependencies: importable `app` package (i.e. the requirements.txt pydantic v2
              upgrade must be applied first); no live server or DB connection
              required — uses FastAPI's in-process TestClient.

Purpose: fast, no-DB sanity check that the meetings/applications/notifications
routers still mount correctly and reject unauthenticated requests the same
way after the service-layer extraction (Phase 1/2 refactor). This is NOT a
substitute for the pytest suite — it only checks that routes exist, are
wired to the app, and enforce auth. Add authenticated checks (see bottom)
once you have a way to mint a test JWT via this repo's existing test
fixtures.
"""
import sys
from pathlib import Path

# Allow running as `python backend2/scripts/testing/smoke_api.py` from repo root.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)

# (method, path, expected_status, description)
UNAUTHENTICATED_CHECKS = [
    ("GET", "/health", 200, "liveness check"),
    ("GET", "/meetings/list", 401, "meetings list requires auth"),
    ("GET", "/meetings/availability/my-slots", 401, "availability slots require auth"),
    ("GET", "/applications/my-applications", 401, "applications list requires auth"),
    ("GET", "/notifications", 401, "notifications list requires auth"),
    ("GET", "/notifications/unread-count", 401, "unread count requires auth"),
]


def run_checks(checks):
    failures = []
    for method, path, expected, description in checks:
        resp = client.request(method, path)
        ok = resp.status_code == expected
        status = "OK" if ok else "FAIL"
        print(f"[{status}] {method:4s} {path:40s} -> {resp.status_code} (expected {expected}) — {description}")
        if not ok:
            failures.append((method, path, expected, resp.status_code, description))
    return failures


def main():
    print(f"Smoke testing app: {app.title}\n")
    failures = run_checks(UNAUTHENTICATED_CHECKS)

    print()
    if failures:
        print(f"{len(failures)} smoke check(s) FAILED:")
        for method, path, expected, actual, description in failures:
            print(f"  - {method} {path}: expected {expected}, got {actual} ({description})")
        raise SystemExit(1)

    print(f"All {len(UNAUTHENTICATED_CHECKS)} smoke checks passed.")


if __name__ == "__main__":
    main()

