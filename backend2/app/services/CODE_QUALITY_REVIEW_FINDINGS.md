# Code Quality & Consistency Review — Findings and Proposed Changes

**Branch:** `claude/code-quality-consistency-review-f3vtwe`
**Status:** No changes applied. Analysis only, per request.
**Context:** Two prior commits on this branch (`d3bf8fd` "Phase 1+2 — service layer extraction", `12dbc1a` "code quality and consistency refinements") already attempted most of this checklist. This report evaluates what actually landed vs. what the checklist requires.

---

## 🔴 Blocker to fix first — broken dependency pin

Everything in "Backend Verification" depends on being able to run the test suite. Right now you can't.

**File:** `backend2/requirements.txt`
```
fastapi==0.95.2
sqlmodel==0.0.8
sqlalchemy==1.4.41
pydantic==1.10.13
```

**Problem:** `app/schemas.py:7` imports `computed_field, ConfigDict` and `app/notification_payloads.py:9` imports `field_validator, ConfigDict` from pydantic — these are pydantic-v2-only. Multiple routers also call `.model_dump()` (v2 API): `applications.py:153`, `calendar.py:412`, `subscriptions.py:108`, `notification_preferences.py:184/197/241`, `meeting_update_service.py:163`. I verified pydantic 1.10.13 is what's actually installed in this environment (`pip show pydantic` → 1.10.13) and confirmed the app package cannot import at all under it. Also `python-magic-bin==0.4.14` in the same file has no Linux wheel, so a plain `pip install -r requirements.txt` fails outright on this platform regardless.

This is **pre-existing** (not introduced by the two refactor commits — `schemas.py`/`requirements.txt` weren't touched by them), but it blocks the verification step this checklist explicitly requires. It should be fixed before, or as slice 0 of, the "Backend Verification" work.

**Proposed change:** upgrade to a pydantic-v2-compatible stack rather than downgrade the code (the codebase has already drifted to v2 idioms in ~8 files):
```diff
- fastapi==0.95.2
- sqlmodel==0.0.8
- sqlalchemy==1.4.41
- pydantic==1.10.13
+ fastapi==0.104.1
+ sqlmodel==0.0.14
+ sqlalchemy==2.0.23
+ pydantic==2.5.3
...
- python-magic-bin==0.4.14     # Windows: bundles native libmagic DLL (no-op on Linux/Mac)
+ python-magic-bin==0.4.14; sys_platform == "win32"   # Windows-only native libmagic DLL
```
This is a real dependency-surface change (SQLAlchemy 1.4→2.0 changes session/query semantics in places), so it needs its own dedicated PR slice with the full test suite green before anything else in this checklist can be trusted — don't fold it into the "code quality" slice.

---

## 1. Code Quality and Consistency Pass

### 1.1 Remove now-unused imports in meetings.py / applications.py
**Status: DONE** for the two named files. `pyflakes` reports zero unused-import warnings in `backend2/app/routers/meetings.py` and `backend2/app/routers/applications.py` (1046 and 160 lines respectively).

**Status: NOT DONE** in the *new* service modules the extraction created — pyflakes found real dead imports there:

```python
# backend2/app/services/meeting_reschedule_service.py:10 — unused, MeetingEmailService (line 13) is what's actually used
from app.routers.notifications import push_notification
```
**Fix:** delete line 10.

```python
# backend2/app/services/meeting_token_action_service.py:13 — imported, never referenced anywhere else in the file
from app.services.meeting_email_service import MeetingEmailService
```
**Fix:** delete line 13 (the file dispatches emails via `MeetingDispatchService`, imported on line 12, not directly).

Also flagged (broader unused-import cleanup, not strictly in scope of the extraction but same "code quality pass" spirit):
```
app/services/analytics_service.py:28        sqlmodel.func unused
app/services/calendar_providers.py:8        datetime.timedelta unused
app/services/email_service.py:19,24         typing.Any, timedelta, timezone unused
app/services/interview_scheduling_service.py:12   app.models.Company unused
app/services/lifecycle_service.py:17         typing.List, Optional unused; :605 dead local var `cutoff`
app/services/meeting_email_service.py:14     datetime.datetime unused
app/services/meeting_service.py:18           MeetingParticipant, Notification unused
app/services/notification_email_service.py:8-9   unused imports; :302 f-string with no placeholders
app/services/notification_service.py:22      5 unused imports from notification_registry
app/services/profile_completion_service.py:5     typing.Optional unused
app/services/resume_parser.py:10             json unused
app/services/video_providers.py:9             os unused
```
Recommend a separate `ruff --select F401,F841 --fix` (or `pyflakes` + manual) pass across `app/services/` as its own small slice.

### 1.2 Normalize logging style in new service modules
**Status: PARTIAL.** All 12 new service modules correctly do `logger = logging.getLogger(__name__)`, matching the router. But style is inconsistent:
- No module uses `extra={}` structured context — everything is f-strings with embedded values, e.g. `meeting_dispatch_service.py:50`: `logger.info(f"[MEETING_DISPATCH] send_cancelled_emails count={len(recipient_user_ids)}")`.
- `app/services/audit.py:87-92` is the sole file using lazy `%s` formatting — a different convention from every service touched by this refactor.
- Bracketed tags are ad hoc per module (`[MEETING_DISPATCH]`, `[MEETING_TOKEN_ACTION]`, `[INTERVIEW]`, `[STARTUP]`...) with no shared prefix scheme.
- Some calls omit identifying context entirely, e.g. `meeting_token_action_service.py:40`: `logger.info("[MEETING_TOKEN_ACTION] confirm_via_token")` — no `meeting_id`/`user_id`/`request_id`, which defeats "consistent incident tracing" (item 2's stated goal).

**Proposed fix — adopt one convention across the 12 new service modules.** Example for `meeting_token_action_service.py:40`:
```diff
- logger.info("[MEETING_TOKEN_ACTION] confirm_via_token")
+ logger.info(
+     "[MEETING_TOKEN_ACTION] confirm_via_token meeting_id=%s user_id=%s",
+     meeting_id, current_user.get("id"),
+ )
```
Apply the same `logger.<level>("[TAG] message key=%s key2=%s", val, val2)` pattern (matches `audit.py`'s existing convention, avoids f-string cost on disabled log levels) across all 12 files. This is mechanical but touches many call sites — worth its own slice.

### 1.3 request_id propagation
**Status: PASS for applications, N/A-by-design for meetings.** `app/middleware/request_id.py:21-52` mints/threads `X-Request-Id` via `scope["state"]["request_id"]`. `application_router_workflow_service.py` pulls it (`getattr(request.state, "request_id", None)`) at lines 19/49/81/111 and threads it into `ApplicationService.*` and `log_activity_event(...)` — matches `tests/test_application_request_id_propagation.py` exactly (once the pydantic blocker is fixed and the test can actually run).

Meeting services never thread `request_id` — but the pre-extraction baseline (`git show d3bf8fd~1:backend2/app/routers/meetings.py`) never called `log_activity_event`/audit for meetings either, so this isn't a regression from extraction. It is, however, a real gap against the item's stated goal ("request_id propagation... where audit logging is performed") — meetings currently have no audit trail correlated by request_id at all.

**Optional follow-up (separate from parity, a genuine enhancement):** if meeting mutations should get the same traceability as applications, thread `request.state.request_id` into `MeetingService.create_timeline_event` the same way `application_router_workflow_service.py` does — but this is new behavior, not "keep parity," so scope it as its own explicit slice rather than bundling into "no behavior change."

### 1.4 Role checks parity across extracted service boundaries
**Status: PASS.** Diffed the extracted services against `git show d3bf8fd~1:...` line by line:
- `meeting_cancel_service.py:32-33` ⟷ baseline `:802-803` (candidate cannot cancel)
- `meeting_update_service.py:38-42` ⟷ baseline `:532-536` (organizer-only update)
- `meeting_reschedule_service.py:28-31` ⟷ baseline `:944-945` (organizer-only reschedule)
- `meeting_respond_reschedule_service.py:29-30` ⟷ baseline `:1226-1227`
- `meeting_token_action_service.py:119` ⟷ baseline `:1542` (token organizer check)
- `application_router_workflow_service.py:54,86` ⟷ baseline `applications.py:252-253,380-381` (recruiter/HR-only status & review)

No drift found. `tests/test_extracted_role_checks.py` expects exactly these error strings and current source matches — no code change needed here, just re-confirm via a real test run once the pydantic blocker is fixed.

### 1.5 Transaction boundary equivalence
**Status: PASS.** Verified commit ordering is byte-for-byte equivalent to baseline in every extracted service (`meeting_cancel_service.py:70-153`, `meeting_update_service.py:109/182/198`, `meeting_token_action_service.py:75/137/218`, `application_router_workflow_service.py:128/143`, `interview_scheduling_service.py:392-475`): commit happens immediately after the state mutation, before timeline/notification/email dispatch, matching the pre-extraction code. No double-commits, no missing commits, no commit-after-dispatch inversions. No change needed.

---

## 2. Backend Verification Before Frontend Work

### 2.1 Run all delegation tests together
**Status: BLOCKED, not "stable pass."** All 12 delegation-related test files (`test_applications_interview_delegation.py`, `test_applications_status_review_delegation.py`, `test_extracted_role_checks.py`, `test_meetings_cancel_delegation.py`, `test_meetings_request_respond_reschedule_delegation.py`, `test_meetings_reschedule_delegation.py`, `test_meetings_update_delegation.py`, `test_meetings_extracted_error_semantics.py`, `test_meetings_extracted_flow_integration.py`, `test_meetings_extracted_response_contracts.py`, `test_meetings_side_effect_parity.py`, `test_application_request_id_propagation.py`) fail at **collection** (`ImportError: cannot import name 'computed_field' from 'pydantic'`) — zero tests actually execute. Fix the requirements.txt blocker above, then re-run:
```
cd backend2 && python3 -m pytest tests/test_*delegation*.py tests/test_extracted_role_checks.py \
  tests/test_meetings_extracted_*.py tests/test_meetings_side_effect_parity.py \
  tests/test_application_request_id_propagation.py -v
```

### 2.2 Run meeting/notification tests
**Status: BLOCKED**, same root cause. `test_meetings*.py` (10 files) and `test_notification*.py` all error at collection.

### 2.3 API smoke pass on key routes
**Status: NOT DONE — no such script exists.** `find backend2 -iname '*smoke*'` returns nothing on the backend side (the changelog's "smoke tests" claim refers only to the frontend `__smoke__/workflowPaths.test.ts`, which is a mocked unit test, not a live API smoke test).

**Proposed addition:** `backend2/scripts/testing/smoke_api.py` — a thin script hitting the key routes with `TestClient` (no live server/DB needed if you use the existing test fixtures), e.g.:
```python
"""API smoke pass: meetings, applications, notifications key routes.
Run: python backend2/scripts/testing/smoke_api.py
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
CHECKS = [
    ("GET", "/meetings/my", 401),          # unauthenticated -> expect 401, not 500
    ("GET", "/applications/my", 401),
    ("GET", "/notifications", 401),
    ("GET", "/health", 200),
]

def main():
    failures = []
    for method, path, expected in CHECKS:
        resp = client.request(method, path)
        status = "OK" if resp.status_code == expected else "FAIL"
        if status == "FAIL":
            failures.append((method, path, expected, resp.status_code))
        print(f"[{status}] {method} {path} -> {resp.status_code} (expected {expected})")
    if failures:
        raise SystemExit(f"{len(failures)} smoke check(s) failed")

if __name__ == "__main__":
    main()
```
This is a starting skeleton — extend `CHECKS` with authenticated cases using existing test fixtures/tokens once the pydantic blocker is resolved and you can actually import `app.main`.

### 2.4 Compare key endpoint behavior with baseline docs/spec
**Status: PARTIAL / unverified.** `docs/PHASE1_REFACTOR_CHANGELOG.md`, `docs/PHASE1_PR_SLICE_GUIDE.md`, and root `REFACTOR_CHANGES.md` all *assert* "no behavior change" / endpoint identity, but none contain an actual before/after diff, captured response payload, or OpenAPI snapshot — the claim is currently unfalsifiable. No baseline OpenAPI spec exists anywhere in `docs/`.

**Proposed fix:** generate and commit a baseline snapshot before further changes:
```
cd backend2 && python3 -c "import json; from app.main import app; json.dump(app.openapi(), open('docs/openapi_baseline.json','w'), indent=2)"
```
Then diff future `app.openapi()` output against it in CI as a cheap contract-drift check.

---

## 3. Frontend Follow-up

### 3.1 Split large page orchestration into hooks + presentational components
**Status: PARTIAL — only one of five candidate pages touched.**

| File | Lines | Status |
|---|---|---|
| `CandidateDashboardNew.tsx` | 6219 | **Untouched** |
| `RecruiterDashboardNew.tsx` | 5599 | **Untouched** |
| `JobPostingBuilder.tsx` | 1939 | **Untouched** |
| `HRDashboard.tsx` | 1557 | **Untouched** |
| `JobPreferencesPage.tsx` | 1299 | **Untouched** |
| `MeetingsPage.tsx` | 811 (was larger) | **Done** — uses `hooks/useMeetingsData.ts` + `components/meetings/{AvailabilitySelectorModal,CreateMeetingModal,MeetingDetailsModal,AvailabilitySlotCard}` |

`MeetingsPage.tsx` is a usable template for the pattern, but ~600 of its 811 lines (`:117-811`) are still inline JSX/filtering/formatting that could be extracted further.

**Proposed next slice:** apply the same `useXData` hook + `components/<domain>/*` split to `CandidateDashboardNew.tsx` and `RecruiterDashboardNew.tsx` first (biggest offenders). Concretely: pull data-fetching/state (applications list, meetings list, notification counts, filters) into `hooks/useCandidateDashboardData.ts` / `hooks/useRecruiterDashboardData.ts`, and split rendering into `components/dashboard/{ApplicationsPanel,MeetingsPanel,ProfilePanel,...}.tsx`, following exactly the shape `MeetingsPage.tsx` + `useMeetingsData.ts` already establish. This is a big slice — break it into one component-family per PR (e.g. "extract ApplicationsPanel from CandidateDashboardNew" as its own PR), consistent with item 5.1 below.

### 3.2 Modularize API client usage away from monolithic client.ts
**Status: NOT actually done — cosmetic only.** `frontend2/src/api/client.ts` is still 746 lines and still contains the real implementations (`createMeeting`, `getMeetings`, `updateMeeting`, `cancelMeeting`, `rescheduleMeeting`, availability endpoints at `:453-525`; applications logic at `:257-322`). The new `meetingsClient.ts` (12 lines) and `applicationsClient.ts` (25 lines) are pure pass-through wrappers:
```ts
// frontend2/src/api/meetingsClient.ts:9 — current state
getMeetings: (params) => apiClient.getMeetings(params),
```
Nothing was actually moved out of `client.ts`; callers (including `AuthContext.tsx` and most pages) still import `apiClient` from `./client` directly, so the wrapper files add indirection without reducing `client.ts`'s size or scope.

**Proposed real fix** — move the implementation, not just re-export it:
```ts
// frontend2/src/api/meetingsClient.ts — target state
import { http } from './httpClient'; // shared axios/fetch instance, extracted from client.ts

export const meetingsClient = {
  getMeetings: (params) => http.get('/meetings', { params }),
  createMeeting: (data) => http.post('/meetings/create', data),
  updateMeeting: (id, data) => http.patch(`/meetings/${id}`, data),
  cancelMeeting: (id, reason) => http.post(`/meetings/${id}/cancel`, { reason }),
  rescheduleMeeting: (id, data) => http.post(`/meetings/${id}/reschedule`, data),
  // ...move the rest of the meetings-related methods out of client.ts here
};
```
Then delete the corresponding methods from `client.ts` (`:453-525` etc.) and update `apiClient` to re-export from the domain clients for any remaining callers during migration, retiring `apiClient` once all call sites are updated. Do this one domain at a time (meetings, then applications, then notifications) as separate slices — each is independently testable against `__smoke__/workflowPaths.test.ts`.

### 3.3 Keep auth/role behavior unchanged while refactoring AuthContext.tsx
**Status: DONE, low risk.** `AuthContext.tsx` (95 lines) had only `localStorage` sync logic extracted to `utils/authStorage.ts` (`clearAuthStorage`, `syncAuthUserToStorage`) — a genuine, safe, small extraction. Role field handling (`role: (data.role ?? '').toString().toLowerCase().trim()` at `:60`) is untouched. No further action needed here unless you want it split further, which isn't required by the checklist's own "keep unchanged" framing.

### 3.4 Add frontend smoke tests for candidate/recruiter paths
**Status: PARTIAL.** `frontend2/src/__smoke__/workflowPaths.test.ts` exists (48 lines), wired correctly into `vite.config.ts:10-13`'s `test.include` and a dedicated `npm run test:smoke` script. But it's narrow: it mocks `apiClient` entirely and only asserts that `meetingsClient`/`applicationsClient`/`notificationsClient` call through to the mock — a contract test, not a real page-level or integration smoke test. Could not execute it in this environment (`node_modules` not installed, `vitest: not found`); recommend `cd frontend2 && npm install && npm run test:smoke -- --run` to confirm it currently passes elsewhere.

**Proposed next slice:** add actual component-level smoke tests (React Testing Library render + interaction) for the candidate meetings flow and recruiter applications flow, not just the client wrapper contracts, e.g. `MeetingsPage.smoke.test.tsx` rendering `<MeetingsPage>` with a mocked `useMeetingsData` and asserting key UI states (list renders, modal opens, cancel button calls the right handler).

---

## 4. Scripts and Operations Cleanup

### 4.1 Consolidate root-level scripts into governed categories
**Status: NOT DONE.** `backend2/scripts/{migrations,seed,operations}/` exist, but **60 loose script files still sit at `backend2/` root**, including the exact ones the wrappers claim to govern (`run_migration.py`, `migrate_add_organization.py`, `reset_db.py`, `reset_and_reseed.py`, `seed_phase2_dataset.py`, `seed_product_taxonomy.py`), plus ~50 more never referenced by the new structure at all (`check_*.py`, `migrate_*.py`, `verify_*.py`, `add_*.py`, `start.sh`, etc.). `testscripts/` at repo root also still has a stray `datadetails.py` and a leftover Word lock file, untouched.

### 4.2 Eliminate duplicate script variants
**Status: NOT DONE.** The six "governed" files are 7-line `runpy.run_path(...)` shims pointing back at the unchanged originals — nothing was deleted or merged:
```python
# backend2/scripts/migrations/run_migration.py — current, full contents
"""Script metadata: category=migrations, source=backend2/run_migration.py, mode=wrapper."""
from pathlib import Path
import runpy
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'run_migration.py'), run_name='__main__')
```
`backend2/scripts/INDEX.md` itself documents this as intentional ("preserving existing root scripts") with a "Next Consolidation Step" ("retire duplicate root variants after parity validation") that was never executed. Additional un-consolidated duplication found: `test_data/seed_data.py` (1216 lines) vs `test_data/seed_data_v2.py` (1259 lines); `reset_db.py` vs `reset_db_clean.py` (the latter has no wrapper at all, orphaned); `scripts/testing/check_enum.py` vs `check_enum_type.py` vs `check_enum_values.py`; `scripts/testing/test_logging_system.py` (0 bytes, dead stub) next to `test_logging_system_fixed.py` (263 lines).

**Proposed fix (do this as the actual consolidation, not another wrapper layer):** for each governed category, move the real file content into `scripts/<category>/`, delete the root duplicate, and update any callers/docs referencing the old path. E.g.:
```
git mv backend2/run_migration.py backend2/scripts/migrations/run_migration.py   # replaces the shim with the real file
git mv backend2/reset_db.py backend2/scripts/operations/reset_db.py
git rm backend2/scripts/testing/test_logging_system.py   # 0-byte dead stub
```
Pick one canonical seed script between `seed_data.py`/`seed_data_v2.py` (check which is actually referenced by other scripts/docs — `grep -rn "seed_data_v2\|seed_data\b" backend2/` first), delete the other, and note the removal in the changelog.

### 4.3 Standardize script headers and execution metadata
**Status: NOT DONE.** Sampled 6 files — none have shebangs; docstring quality ranges from none (`scripts/testing/check_bhavana.py`) to thorough with Category/Idempotent/Rollback/Dependencies/Risk-Level metadata (`scripts/migrations/create_recommender_schema.py`). No shared template.

**Proposed template**, applied to every script under `backend2/scripts/`:
```python
#!/usr/bin/env python3
"""
<One-line purpose>

Category:     migrations | seed | operations | testing | utilities
Idempotent:   yes/no
Run:          python backend2/scripts/<category>/<name>.py [args]
Rollback:     <how to undo, or "N/A">
Dependencies: <e.g. requires DB connection, env vars X/Y>
"""
```
Use `create_recommender_schema.py`'s existing metadata block as the reference — it's already the most complete example in the tree.

### 4.4 Add runbook/index documentation for script usage order and rollback
**Status: PARTIAL.** `backend2/scripts/INDEX.md` (44 lines) exists and covers the three categories with an ordering section and a "Rollback Expectations" section, but the rollback guidance is generic ("rely on DB backup/snapshot", "re-run after reset") rather than per-script, and the doc explicitly describes the unfinished root-duplication state as acceptable rather than flagging it as pending work.

**Proposed fix:** once 4.2's actual consolidation is done, update `INDEX.md` to (a) remove the "wrapper mode" language since files will have physically moved, and (b) add a rollback line per script, not just per category, e.g.:
```markdown
### migrations/run_migration.py
Run: `python backend2/scripts/migrations/run_migration.py <name>`
Rollback: re-run with `--down` if the target migration defines a downgrade; otherwise restore from the pre-migration DB snapshot noted in the migration's own docstring.
```

---

## 5. Release and Change Management

### 5.1 Ship in small PR slices (one extracted workflow per PR)
**Status: NOT FOLLOWED.** `backend2/docs/PHASE1_PR_SLICE_GUIDE.md` mandates "one extracted workflow per PR where possible," but all the work landed in two giant commits on this single branch: `d3bf8fd` (6112 insertions / 518 deletions, 41 files) and `12dbc1a` (4992 insertions / 2039 deletions, 50 files). There's no PR history showing the documented slice boundaries were actually used.

**Proposed fix going forward:** treat everything still outstanding in sections 1–4 above as separate branches/PRs off this one, in this order (each gated on the previous being green):
1. Fix `requirements.txt` pydantic blocker (own PR, full regression run)
2. Remove dead imports in the 2 new service files (tiny, safe, first)
3. Real script consolidation (4.1–4.4) — mechanical, low risk, but touches many files
4. Logging normalization across the 12 service modules (5.2-style mechanical change)
5. One frontend dashboard split per PR (`CandidateDashboardNew` first, then `RecruiterDashboardNew`, then the rest)
6. Real `client.ts` → domain-client extraction, one domain per PR

### 5.2 Require parity test pass per slice before merge
**Status: NOT ENFORCEABLE YET** — blocked by the same pydantic issue; there is currently no working test gate. Fix the blocker first, then this becomes a straightforward CI check (`pytest tests/ -x` must pass before merge).

### 5.3 Capture each slice in changelog notes as no-behavior-change internal refactor
**Status: PARTIAL.** `docs/PHASE1_REFACTOR_CHANGELOG.md` and root `REFACTOR_CHANGES.md` do this in prose, but as noted in 2.4, the "no behavior change" claims are asserted, not backed by captured before/after evidence. Once the OpenAPI baseline snapshot (2.4) and a real test run exist, changelog entries should link to the specific test run / diff that substantiates each claim rather than stating it unsupported.

### 5.4 After all Phase 1 slices, run one consolidated regression pass
**Status: NOT DONE — currently impossible.** Cannot run any consolidated regression until the pydantic blocker is fixed. Once fixed, current full-suite baseline (for reference, includes pre-existing unrelated failures you'll still need to triage separately): 12 passed / 14 failed / 8 errors / 16 files failing at collection, out of which the 5 `test_meetings_integration.py` failures need a live Postgres connection (`localhost:5432` refused) and the recommendation-engine failures (`test_recommendation_gateway.py`, `_performance.py`, `_sync.py`, `_v2.py`) are unrelated pre-existing bugs (MagicMock/SQLAlchemy config issues), not part of this refactor's scope.

---

## Suggested order of work

1. **Fix `requirements.txt`** (pydantic v1→v2 stack) — unblocks everything else, own PR.
2. Delete the 2 dead imports (`meeting_reschedule_service.py:10`, `meeting_token_action_service.py:13`) — trivial, do alongside #1.
3. Re-run the full test suite for real; triage the pre-existing unrelated failures (Postgres connection, recommendation engine) separately from meetings/applications parity.
4. Real script consolidation (delete root duplicates, keep the moved files as the only copy).
5. Logging normalization across the 12 new service modules.
6. Add the backend API smoke script and OpenAPI baseline snapshot.
7. Frontend: split `CandidateDashboardNew.tsx` and `RecruiterDashboardNew.tsx` following the `MeetingsPage.tsx` pattern, one PR per dashboard.
8. Frontend: actually move logic out of `client.ts` into the domain clients, one domain per PR.
9. Update `INDEX.md` and changelog docs to reflect what's actually true once 1–8 land.

No files were modified, no commits were created, and no PR was opened for this review — this is purely the analysis you asked for.
