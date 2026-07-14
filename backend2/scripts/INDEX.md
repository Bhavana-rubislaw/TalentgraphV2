<!-- # Backend Scripts Runbook

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

Gradually migrate additional root scripts into wrappers under these categories, then retire duplicate root variants after parity validation. -->
# Backend Scripts Runbook

## Categories

- migrations: schema/data migrations that should be run in controlled order.
- seed: deterministic data population scripts.
- operations: environment maintenance/reset workflows.

## Recommended Order

1. Run migrations under scripts/migrations.
2. Run seed scripts under scripts/seed.
3. Run operation scripts under scripts/operations only when needed.

## Script Usage

All scripts below must be run with **backend2/ as your current working directory**
(`cd backend2` first). They resolve the `app` package relative to their own file
location, not your shell's CWD, so running them from anywhere else will fail with
`ModuleNotFoundError: No module named 'app'`.

- `python scripts/migrations/run_migration.py`
  Adds `recruiter_notes`, `last_status_updated_at`, and
  `last_status_updated_by_user_id` columns to the `application` table.
  Connects directly via a hardcoded local Postgres connection string
  (`dbname=talentgraph_v2`, `host=localhost`) rather than `DATABASE_URL` —
  only usable against a local dev database as currently written.
  Rollback: `ALTER TABLE application DROP COLUMN <name>;` for each added column.

- `python scripts/migrations/migrate_add_organization.py`
  Creates the `organization` and `user_invitation` tables, backfills
  `Organization` rows from existing `Company.company_name` groupings, and
  links each `Company` to its `Organization`. Idempotent — re-running skips
  columns/tables that already exist.
  Rollback: restore from a pre-migration DB snapshot; there is no scripted
  downgrade (the migration doesn't drop columns it added).

- `python scripts/seed/seed_phase2_dataset.py`
  Upgrades an existing baseline dataset to Phase 2 targets (120 job
  postings, 118 job preference profiles, etc.). Assumes baseline data
  already exists — not a full seed from empty.
  Rollback: `python scripts/operations/reset_db.py` then reseed from
  scratch with `seed_data_v2.py`.

- `python scripts/seed/seed_product_taxonomy.py`
  Populates `product_vendor`, `product_type`, and `product_role` lookup
  tables from a static curated taxonomy. Safe to re-run (upserts by name).
  Rollback: `TRUNCATE product_vendor, product_type, product_role CASCADE;`
  then re-run.

- `python scripts/operations/reset_db.py`
  Drops and recreates all tables from the current models — schema reset
  only, **no reseed**. For a full reset+reseed, use one of the two scripts
  below instead.
  Rollback: none needed — this only recreates empty schema; re-run any
  seed script afterward to repopulate.

- `python scripts/operations/reset_and_reseed.py`
  Full reset: drops/recreates schema, creates the system admin account,
  then reseeds via `scripts/test_data/seed_data_v2.py`. Its internal steps
  are invoked via `subprocess` and inherit whatever CWD you ran this script
  from — always run it as `cd backend2; python scripts/operations/reset_and_reseed.py`,
  not via an absolute path from elsewhere.
  Rollback: no automatic rollback; restore from a pre-reset DB snapshot if
  something goes wrong mid-run.

`scripts/operations/reset_db_clean.py` (not yet moved into this structure —
see Next Consolidation Step) does the same drop/recreate/reseed/verify
sequence as `reset_and_reseed.py` but as a single self-contained script
without shelling out to subprocesses. Prefer `reset_and_reseed.py` on
non-Windows environments until `reset_db_clean.py` is reviewed for
cross-platform compatibility.

## Reproducibility Metadata

As of the script consolidation slice, the six scripts listed above are the
**real, canonical copies** — they were moved (not wrapped) from `backend2/`
root into their category folders, and the old root-level duplicates were
deleted. `scripts/test_data/seed_data.py` (an unreferenced older variant of
`seed_data_v2.py`) was deleted outright, not moved — nothing imported it.

## Rollback Expectations

See the per-script notes above. General fallback: `operations/reset_db.py`
returns to an empty schema; `operations/reset_and_reseed.py` (or
`reset_db_clean.py`) returns to a known-good seeded baseline. Neither
substitutes for a real DB snapshot/backup before running migrations against
data you can't afford to lose.

## Known issue: hardcoded credentials

Several scripts across this tree (seed scripts, `reset_and_reseed.py`,
`reset_db_clean.py`, and others outside this directory) hardcode a shared
admin credential (`talentgraph.interviews@gmail.com`) for the system admin
account they create. This credential is committed in plaintext across 30+
files in this repository, including documentation. **Do not point any of
these scripts at a database that isn't a disposable local/dev instance
until this is addressed** — treat the credential as already compromised
(anything committed to git history should be assumed exposed) and rotate
it before using it against anything shared or production-adjacent.

## Next Consolidation Step

The following root-level and `scripts/testing`/`scripts/utilities` scripts
still need the same per-file review (CWD/`__file__`-relative import check,
duplicate-detection) applied to them before they can be moved into this
structure: the ~50 remaining root scripts (`check_*.py`, `verify_*.py`,
`add_*.py`, `start.sh`, etc.), plus `reset_db_clean.py`, and the
`scripts/testing/check_enum.py` / `check_enum_type.py` / `check_enum_values.py`
trio and `test_logging_system.py` (0-byte dead stub) / `test_logging_system_fixed.py`
duplicate pair identified during this review.