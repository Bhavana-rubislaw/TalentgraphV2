# Rollback Plan: Standalone Recommender Extraction

## Scope
All changes made under `feat/standalone-recommender-dual-db` can be rolled back
without touching existing API contracts or core database schema.

---

## Pre-Rollback Checklist

- [ ] Confirm current `RECOMMENDER_MODE` value in each environment
- [ ] Snapshot recommender DB row counts (algorithm configs, cached scores, feedback)
- [ ] Note active canary percentage (if in canary phase)
- [ ] Alert on-call of impending rollback window

---

## Rollback Levels

### Level 1: Feature Flag Rollback (< 1 min, zero deployment)
Flip environment variables to route all traffic back to the local adapter:

```bash
RECOMMENDER_ENABLED=true
RECOMMENDER_MODE=local
RECOMMENDER_SHADOW_COMPARE=false
```

Restart app workers. No code deployment needed. Verified by:
- `GET /health` returns `recommender_mode: local`
- Recommendation responses match pre-extraction baselines

### Level 2: Recommender Worker Disable (< 1 min)
Stop sync and recompute background workers without affecting recommendation serving:

```bash
RECOMMENDER_WORKERS_ENABLED=false
WORKERS_ENABLED=true   # keep other workers running
```

Verify: scheduler job list no longer shows `recommendation_sync` or `recommendation_backfill`.

### Level 3: Code Revert (deployment required)
If the gateway or adapter code introduces a regression:

```bash
git revert --no-commit HEAD~N   # N = number of commits to undo
git commit -m "chore: rollback standalone recommender (ADR-001)"
```

Deploy hotfix build. Feature flag must be `RECOMMENDER_MODE=local` before code lands.

### Level 4: Schema Rollback (destructive — last resort)
Only if recommender DB tables must be removed:

```bash
cd backend2
python scripts/migrations/create_recommender_schema.py --rollback
```

This drops: `recommendation_algorithm_config`, `recommendation_score_cache`,
`recommendation_feedback`, `recommendation_run_metrics`, `recommendation_feature_snapshot`,
`recommendation_sync_watermark`.

**Warning**: This loses all pre-computed scores and feedback data. Requires re-backfill after re-applying schema.

---

## Rollback Triggers

| Signal | Action | Level |
|--------|--------|-------|
| Recommendation p95 latency > 500ms | Switch to local mode | 1 |
| Error rate > 1% on `/recommendations/v2/*` | Switch to local mode | 1 |
| Sync pipeline consistently fails for > 10 min | Disable recommender workers | 2 |
| Core DB query spike from gateway | Emergency flag flip + code review | 1 + 3 |
| Recommender DB connection exhaustion | Disable workers, investigate pool config | 2 |

---

## Contacts

- **Backend owner**: Review ADR-001 signatories
- **On-call runbook location**: `docs/operations/runbook.md` (to be created in Sprint 5)
- **Monitoring dashboard**: Admin UI → Algorithm page
