"""
Combine overview CSV exports into one Excel workbook with multiple sheets.

This utility reads CSV files from the latest:
- db_overview_* folder
- codebase_overview_* folder

and writes a single workbook in reports/.

Usage:
    python scripts/utilities/combine_overview_exports.py
    python scripts/utilities/combine_overview_exports.py --reports-dir reports
    python scripts/utilities/combine_overview_exports.py --db-dir reports/db_overview_... --code-dir reports/codebase_overview_...
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence, Set

from openpyxl import Workbook


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def safe_sheet_name(base_name: str, used: Set[str]) -> str:
    cleaned = (
        base_name.replace("[", "_")
        .replace("]", "_")
        .replace(":", "_")
        .replace("*", "_")
        .replace("?", "_")
        .replace("/", "_")
        .replace("\\", "_")
    )
    if not cleaned:
        cleaned = "sheet"

    candidate = cleaned[:31]
    if candidate not in used:
        used.add(candidate)
        return candidate

    suffix = 2
    while True:
        suffix_text = f"_{suffix}"
        trimmed = cleaned[: 31 - len(suffix_text)]
        candidate = f"{trimmed}{suffix_text}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        suffix += 1


def find_latest_dir(base: Path, prefix: str) -> Optional[Path]:
    dirs = [p for p in base.glob(f"{prefix}_*") if p.is_dir()]
    if not dirs:
        return None
    return sorted(dirs, key=lambda p: p.name)[-1]


def list_csvs(folder: Path) -> List[Path]:
    return sorted([p for p in folder.glob("*.csv") if p.is_file()])


def add_csvs_as_sheets(wb: Workbook, csv_paths: Sequence[Path], sheet_prefix: str, used_names: Set[str]) -> int:
    count = 0
    for csv_path in csv_paths:
        base_name = f"{sheet_prefix}_{csv_path.stem}"
        sheet_name = safe_sheet_name(base_name, used_names)
        ws = wb.create_sheet(title=sheet_name)

        with csv_path.open("r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                ws.append(row)

        ws.freeze_panes = "A2"
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Combine overview CSV exports into one workbook")
    parser.add_argument("--reports-dir", default="reports", help="Reports directory path")
    parser.add_argument("--db-dir", default=None, help="Specific db_overview directory")
    parser.add_argument("--code-dir", default=None, help="Specific codebase_overview directory")
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[2]
    reports_dir = (backend_root / args.reports_dir).resolve()

    db_dir = Path(args.db_dir).resolve() if args.db_dir else find_latest_dir(reports_dir, "db_overview")
    code_dir = Path(args.code_dir).resolve() if args.code_dir else find_latest_dir(reports_dir, "codebase_overview")

    if db_dir is None:
        raise SystemExit("No db_overview_* directory found.")
    if code_dir is None:
        raise SystemExit("No codebase_overview_* directory found.")

    db_csvs = list_csvs(db_dir)
    code_csvs = list_csvs(code_dir)

    if not db_csvs and not code_csvs:
        raise SystemExit("No CSV files found in selected export folders.")

    wb = Workbook()
    wb.remove(wb.active)
    used_names: Set[str] = set()

    db_count = add_csvs_as_sheets(wb, db_csvs, "db", used_names)
    code_count = add_csvs_as_sheets(wb, code_csvs, "code", used_names)

    out_path = reports_dir / f"combined_overview_{utc_stamp()}.xlsx"
    wb.save(out_path)

    print("=" * 80)
    print("Combined workbook created")
    print("=" * 80)
    print(f"DB source folder: {db_dir}")
    print(f"Codebase source folder: {code_dir}")
    print(f"DB sheets added: {db_count}")
    print(f"Codebase sheets added: {code_count}")
    print(f"Output workbook: {out_path}")


if __name__ == "__main__":
    main()
