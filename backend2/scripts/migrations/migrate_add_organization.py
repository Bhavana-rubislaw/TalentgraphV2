"""Script metadata: category=migrations, source=backend2/migrate_add_organization.py, mode=wrapper."""

from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'migrate_add_organization.py'), run_name='__main__')
