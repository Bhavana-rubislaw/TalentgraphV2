# Backend Scripts Runbook

## Categories

- migrations: schema/data migrations that should be run in controlled order.
- seed: deterministic data population scripts.
- operations: environment maintenance/reset workflows.

## Recommended Order

1. Run migration scripts under scripts/migrations.
2. Run seed scripts under scripts/seed.
3. Run operation scripts under scripts/operations only when needed.

## Usage

From backend2 folder:

- python scripts/migrations/run_migration.py
- python scripts/migrations/migrate_add_organization.py
- python scripts/seed/seed_phase2_dataset.py
- python scripts/seed/seed_product_taxonomy.py
- python scripts/operations/reset_db.py
- python scripts/operations/reset_and_reseed.py

These are the real scripts, not wrappers — the former root-level duplicates
(backend2/run_migration.py, backend2/migrate_add_organization.py, etc.) have
been removed. Each script resolves its own `app` import via
`sys.path.insert(0, str(Path(__file__).resolve().parents[2]))` (or
equivalent), so it works correctly when run from its scripts/<category>/
location with backend2/ as the working directory.

## Rollback Expectations

- migrations: rely on DB backup/snapshot and scripted downgrade if available.
- seed: re-run after reset to return to deterministic baseline.
- operations: use reset_and_reseed for full environment recovery.
