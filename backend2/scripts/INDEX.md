# Backend Scripts Runbook

## Categories

- migrations: schema/data migrations that should be run in controlled order.
- seed: deterministic data population scripts.
- operations: environment maintenance/reset workflows.

## Recommended Order

1. Run migration wrappers under scripts/migrations.
2. Run seed wrappers under scripts/seed.
3. Run operation wrappers under scripts/operations only when needed.

## Wrapper Usage

From backend2 folder:

- python scripts/migrations/run_migration.py
- python scripts/migrations/migrate_add_organization.py
- python scripts/seed/seed_phase2_dataset.py
- python scripts/seed/seed_product_taxonomy.py
- python scripts/operations/reset_db.py
- python scripts/operations/reset_and_reseed.py

## Reproducibility Metadata

Each wrapper includes a header with:

- category
- source script path
- execution mode

This keeps script provenance explicit while preserving existing root scripts.

## Rollback Expectations

- migrations: rely on DB backup/snapshot and scripted downgrade if available.
- seed: re-run after reset to return to deterministic baseline.
- operations: use reset_and_reseed for full environment recovery.

## Next Consolidation Step

Gradually migrate additional root scripts into wrappers under these categories, then retire duplicate root variants after parity validation.
