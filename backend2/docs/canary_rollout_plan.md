# Canary Rollout Plan: Standalone Recommender Service

## Overview

This document defines the staged rollout procedure for transitioning traffic
from the `local` adapter (in-process scoring) to the `standalone` adapter
(remote recommender service), using shadow mode as a validation gate.

---

## Pre-Rollout Checklist

| Item | Owner | Done |
|------|-------|------|
| Sprint 6 contract tests green in CI | Backend lead | [ ] |
| Sprint 6 performance tests green | Backend lead | [ ] |
| Recommender DB provisioned in staging | Infra | [ ] |
| Backfill completed and validated (count + checksum) | Backend lead | [ ] |
| Shadow mode active for ≥ 48h in staging | QA | [ ] |
| Drift rate < 5% in shadow mode | QA | [ ] |
| Admin Algorithm page accessible and showing correct data | Frontend lead | [ ] |
| Runbook reviewed by on-call | On-call | [ ] |
| Rollback drilled successfully once | On-call | [ ] |

---

## Rollout Stages

### Stage 0: Shadow Mode (No user impact)

**Goal**: Validate scoring parity between local and standalone adapters.

**Steps**:
1. Set `RECOMMENDER_MODE=shadow` and `RECOMMENDER_SHADOW_COMPARE=true` in staging.
2. Let the system run for 48 hours minimum.
3. Monitor `RecommendationRunMetrics` rows with `run_type=shadow_compare:*` in Admin UI.
4. **Gate**: drift rate (records_failed / records_processed) < 5% over all shadow runs.
5. Confirm error rate on `/recommendations/v2/*` = 0%.

**Rollback**: Set `RECOMMENDER_MODE=local`.

---

### Stage 1: Canary — 5% of Traffic

**Goal**: Validate standalone adapter in production at minimal blast radius.

> Note: Traffic percentage routing requires a load-balancer or feature-flag
> service that can route by session/user cohort.  If not available, this
> stage can be skipped; go directly to Stage 2 with monitoring.

**Steps**:
1. Route 5% of `/recommendations/v2/*` traffic to `RECOMMENDER_MODE=standalone`.
2. Monitor for 4 hours:
   - Error rate on recommendation endpoints < 0.5%
   - p95 latency < 300ms
   - Fallback rate < 1% (logged as `[STANDALONE-ADAPTER] ... falling back`)
3. **Gate**: All metrics within SLO for 4 hours continuous.

**Rollback**: Flip cohort routing back to 0%.

---

### Stage 2: Canary — 20% of Traffic

**Steps**:
1. Expand canary to 20% for 8 hours.
2. Same SLO gates as Stage 1.
3. **Gate**: Error rate < 0.5%, p95 < 300ms, fallback rate < 1%.

**Rollback**: Flip back to Stage 1 (5%) or 0%.

---

### Stage 3: Canary — 50% of Traffic

**Steps**:
1. Expand to 50% for 12 hours.
2. Monitor:
   - Recommender DB connection pool utilisation (target < 70%)
   - Core DB query rate (should be stable — not increasing)
   - Recommendation quality signals (feedback like/dismiss ratio)
3. **Gate**: All SLOs met for 12 hours.

**Rollback**: Revert to 20% or 0%.

---

### Stage 4: Full Cutover — 100%

**Steps**:
1. Set `RECOMMENDER_MODE=standalone` globally.
2. Disable shadow mode: `RECOMMENDER_SHADOW_COMPARE=false`.
3. Monitor for 24 hours before declaring stable.

**Rollback**: `RECOMMENDER_MODE=local` (Level 1 rollback from rollback_plan.md).

---

### Stage 5: Stabilisation and Cleanup (30 days post-cutover)

1. Confirm no rollbacks triggered for 30 days.
2. Remove `LocalRecommendationAdapter` fallback code path.
3. Archive `RECOMMENDER_MODE=local` from env contract.
4. Update ADR-001 status to "Superseded".

---

## SLO Reference

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Recommendation p95 latency | > 300ms | > 800ms | Roll back to local |
| Error rate on `/v2/*` | > 0.5% | > 1% | Roll back to local |
| Fallback rate | > 1% | > 5% | Investigate standalone; roll back if persistent |
| Recommender DB pool utilisation | > 70% | > 90% | Scale pool / DB instance |
| Drift rate (shadow) | > 5% | > 15% | Pause rollout, investigate scoring delta |
| Sync watermark lag | > 30min | > 2h | Restart workers; trigger manual sync |

---

## Rollback Triggers (Automatic Halt)

The canary must be halted immediately (no confirmation required) if:
1. Recommendation error rate exceeds **1%** for 5 consecutive minutes.
2. p95 latency exceeds **800ms** for 10 consecutive minutes.
3. Fallback rate exceeds **5%** for 5 consecutive minutes.
4. Any unhandled exception propagates to users from recommendation endpoints.

Action: Set `RECOMMENDER_MODE=local` and page the backend lead.

---

## Contacts and Escalation

- **Stage 0–2**: Backend lead self-service
- **Stage 3–4**: Requires sign-off from tech lead + QA
- **Stage 5 cleanup**: Requires arch review (ADR update)

---

## Related Documents

- [ADR-001](docs/adr/ADR-001-standalone-recommender-dual-db.md)
- [Rollback Plan](docs/rollback_plan.md)
- Admin UI: `/algorithm` page — real-time health and config controls
