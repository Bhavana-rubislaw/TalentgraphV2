"""Script metadata: category=operations, source=backend2/reset_db.py, mode=wrapper."""

from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'reset_db.py'), run_name='__main__')
