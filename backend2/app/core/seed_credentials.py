"""Shared seed/test credential resolution for scripts that create or
reference the system admin account.

Previously ~30 scripts and docs across this repo hardcoded a literal
admin email/password pair, which meant that credential sat in plaintext
in git history regardless of any later rotation. This module centralizes
resolution to one place: set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in
your environment (or backend2/.env) to control the account explicitly.

If SEED_ADMIN_PASSWORD is unset, a random password is generated once and
cached in a git-ignored local file so repeated script runs on the same
machine keep working without hardcoding a real secret anywhere.
"""
import os
import secrets
from pathlib import Path

_LOCAL_PASSWORD_FILE = Path(__file__).resolve().parents[2] / ".seed_admin_password.local"
_MISSING_ENV_WARNED = False

DEFAULT_SEED_ADMIN_EMAIL = "talentgraph.interviews@gmail.com"
DEFAULT_SEED_ADMIN_NAME = "TalentGraph System Admin"


def get_seed_admin_credentials() -> tuple[str, str, str]:
    """Return (email, password, full_name) for the seeded system admin account."""
    global _MISSING_ENV_WARNED

    email = os.getenv("SEED_ADMIN_EMAIL", DEFAULT_SEED_ADMIN_EMAIL)
    name = os.getenv("SEED_ADMIN_NAME", DEFAULT_SEED_ADMIN_NAME)

    password = os.getenv("SEED_ADMIN_PASSWORD")
    if not password:
        if not _MISSING_ENV_WARNED:
            print(
                "[SEED_CREDENTIALS][WARNING] SEED_ADMIN_PASSWORD is not set in the "
                "environment/.env. Falling back to local cached password. "
                "Set SEED_ADMIN_PASSWORD in backend2/.env for explicit, repeatable seeding."
            )
            _MISSING_ENV_WARNED = True

        if _LOCAL_PASSWORD_FILE.exists():
            password = _LOCAL_PASSWORD_FILE.read_text().strip()
        else:
            password = secrets.token_urlsafe(16)
            _LOCAL_PASSWORD_FILE.write_text(password)
            print(
                f"[SEED_CREDENTIALS] No SEED_ADMIN_PASSWORD set - generated a random "
                f"password and cached it at {_LOCAL_PASSWORD_FILE} (git-ignored). "
                f"Set SEED_ADMIN_PASSWORD in your environment or .env to control this "
                f"value explicitly."
            )

    return email, password, name


def get_seed_test_password() -> str:
    """Return the shared password used across seed/demo scripts for
    non-admin test accounts (recruiters, candidates, etc.).

    These scripts have always used one common password for every account
    in the local test environment, so this reuses the same resolution and
    local cache as get_seed_admin_credentials() rather than introducing a
    second independent secret to track.
    """
    _, password, _ = get_seed_admin_credentials()
    return password