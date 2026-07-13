"""Script metadata: category=migrations, source=backend2/run_migration.py, mode=wrapper."""

from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'run_migration.py'), run_name='__main__')
