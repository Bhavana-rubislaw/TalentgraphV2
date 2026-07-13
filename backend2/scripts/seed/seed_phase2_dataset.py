"""Script metadata: category=seed, source=backend2/seed_phase2_dataset.py, mode=wrapper."""

from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'seed_phase2_dataset.py'), run_name='__main__')
