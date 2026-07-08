"""
Export a comprehensive database overview into CSV files (+ ZIP bundle).

What this script exports:
- Database summary and high-level health metrics
- Table overview (row counts, PK/FK/index counts, nullability)
- Column-level metadata (types, defaults, keys, references)
- Foreign key relationships and dependency graph
- Index and unique constraint inventory
- App model to table mapping (from SQLModel metadata)
- Normalization signals (heuristic checks)

Usage:
    python scripts/utilities/export_database_overview.py
    python scripts/utilities/export_database_overview.py --schema public
    python scripts/utilities/export_database_overview.py --output-dir reports
"""

from __future__ import annotations

import argparse
import csv
import sys
import zipfile
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import SQLModel
from openpyxl import Workbook


# Ensure backend root is importable when running from any working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import engine  # noqa: E402
import app.models as app_models  # noqa: E402,F401


@dataclass
class ForeignKeyEdge:
    source_schema: str
    source_table: str
    source_columns: str
    target_schema: str
    target_table: str
    target_columns: str
    constraint_name: str
    on_update: str
    on_delete: str


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def qname(schema: Optional[str], table: str) -> str:
    """Return safely quoted table name for SQL text usage."""
    if schema:
        return f'"{schema}"."{table}"'
    return f'"{table}"'


def get_row_count(db_engine: Engine, schema: Optional[str], table: str) -> int:
    sql = text(f"SELECT COUNT(*) AS c FROM {qname(schema, table)}")
    with db_engine.connect() as conn:
        return int(conn.execute(sql).scalar_one())


def find_model_mapping() -> Dict[str, Dict[str, str]]:
    """
    Build model-to-table mapping from loaded SQLModel subclasses.

    Returns mapping keyed by table name with model metadata.
    """
    mapping: Dict[str, Dict[str, str]] = {}

    def walk_subclasses(cls: type) -> Iterable[type]:
        for sub in cls.__subclasses__():
            yield sub
            yield from walk_subclasses(sub)

    for model_cls in walk_subclasses(SQLModel):
        table_name = getattr(model_cls, "__tablename__", None)
        if not table_name and hasattr(model_cls, "__table__"):
            table_name = getattr(model_cls.__table__, "name", None)

        if not table_name:
            continue

        module_name = getattr(model_cls, "__module__", "")
        class_name = getattr(model_cls, "__name__", "")

        if table_name not in mapping:
            mapping[table_name] = {
                "model_class": class_name,
                "model_module": module_name,
            }

    return mapping


def build_dependency_levels(
    tables: Sequence[str],
    edges: Sequence[ForeignKeyEdge],
) -> Dict[str, int]:
    """
    Compute hierarchy levels from FK dependencies.

    Level 0 = root tables with no dependencies.
    A table level is one plus max(parent levels).
    """
    table_set = set(tables)
    parents: Dict[str, Set[str]] = {t: set() for t in table_set}
    children: Dict[str, Set[str]] = {t: set() for t in table_set}

    for edge in edges:
        src = edge.source_table
        tgt = edge.target_table
        if src in table_set and tgt in table_set:
            parents[src].add(tgt)
            children[tgt].add(src)

    indegree = {t: len(parents[t]) for t in table_set}
    queue = deque(sorted([t for t, d in indegree.items() if d == 0]))

    levels: Dict[str, int] = {t: 0 for t in table_set}
    visited = 0

    while queue:
        node = queue.popleft()
        visited += 1

        for child in sorted(children[node]):
            levels[child] = max(levels.get(child, 0), levels[node] + 1)
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    if visited < len(table_set):
        for table in table_set:
            levels.setdefault(table, 0)

    return levels


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(list(row))


def profile_column_quality(
    db_engine: Engine,
    schema: Optional[str],
    table: str,
    column: str,
    total_rows: int,
) -> Tuple[int, int, float, Optional[int], Optional[float], str]:
    """
    Profile one column with null percentage and distinct-count signals.

    Returns:
      (null_count, non_null_count, null_pct, distinct_non_null, distinct_ratio, status)
    """
    if total_rows <= 0:
        return (0, 0, 0.0, 0, 0.0, "table_empty")

    quoted_table = qname(schema, table)
    quoted_col = f'"{column}"'

    null_sql = text(
        f"SELECT COUNT(*) FILTER (WHERE {quoted_col} IS NULL) AS null_count, "
        f"COUNT(*) FILTER (WHERE {quoted_col} IS NOT NULL) AS non_null_count "
        f"FROM {quoted_table}"
    )

    distinct_sql = text(
        f"SELECT COUNT(DISTINCT {quoted_col}) AS distinct_non_null "
        f"FROM {quoted_table} WHERE {quoted_col} IS NOT NULL"
    )

    try:
        with db_engine.connect() as conn:
            row = conn.execute(null_sql).mappings().one()
            null_count = int(row.get("null_count") or 0)
            non_null_count = int(row.get("non_null_count") or 0)

            distinct_non_null: Optional[int]
            distinct_ratio: Optional[float]
            try:
                distinct_non_null = int(conn.execute(distinct_sql).scalar_one())
                distinct_ratio = (
                    round(distinct_non_null / non_null_count, 6)
                    if non_null_count > 0
                    else 0.0
                )
                status = "ok"
            except SQLAlchemyError:
                distinct_non_null = None
                distinct_ratio = None
                status = "distinct_unavailable"

            null_pct = round((null_count / total_rows) * 100.0, 4)
            return (
                null_count,
                non_null_count,
                null_pct,
                distinct_non_null,
                distinct_ratio,
                status,
            )
    except SQLAlchemyError:
        return (0, 0, 0.0, None, None, "profile_error")


def make_zip(output_dir: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(output_dir.glob("*.csv")):
            zf.write(file_path, arcname=file_path.name)


def safe_sheet_name(base_name: str, used: Set[str]) -> str:
    """Create a valid and unique Excel sheet name (max 31 chars)."""
    cleaned = base_name.replace("[", "_").replace("]", "_").replace(":", "_").replace("*", "_").replace("?", "_").replace("/", "_").replace("\\", "_")
    if not cleaned:
        cleaned = "sheet"

    candidate = cleaned[:31]
    if candidate not in used:
        used.add(candidate)
        return candidate

    suffix = 2
    while True:
        suffix_txt = f"_{suffix}"
        trimmed = cleaned[: 31 - len(suffix_txt)]
        candidate = f"{trimmed}{suffix_txt}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        suffix += 1


def make_workbook_from_csvs(output_dir: Path, workbook_path: Path) -> None:
    """Create one Excel workbook with a sheet per CSV output file."""
    wb = Workbook()
    # Remove the default empty sheet; we'll add one per CSV.
    wb.remove(wb.active)

    used_names: Set[str] = set()
    csv_files = sorted(output_dir.glob("*.csv"))

    for csv_file in csv_files:
        sheet_name = safe_sheet_name(csv_file.stem, used_names)
        ws = wb.create_sheet(title=sheet_name)

        with csv_file.open("r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                ws.append(row)

        ws.freeze_panes = "A2"

    wb.save(workbook_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export detailed DB overview into CSV files.")
    parser.add_argument("--schema", default="public", help="Database schema to inspect (default: public)")
    parser.add_argument(
        "--output-dir",
        default=str(BACKEND_ROOT / "reports"),
        help="Base output directory for reports",
    )
    args = parser.parse_args()

    schema = args.schema or None
    base_out = Path(args.output_dir).resolve()
    stamp = utc_stamp()
    out_dir = base_out / f"db_overview_{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    inspector = inspect(engine)
    dialect = engine.dialect.name

    try:
        table_names = sorted(inspector.get_table_names(schema=schema))
    except SQLAlchemyError as exc:
        raise SystemExit(f"Failed to inspect schema '{schema}': {exc}")

    if not table_names:
        raise SystemExit(f"No tables found in schema '{schema}'.")

    model_mapping = find_model_mapping()

    table_rows: Dict[str, int] = {}
    columns_by_table: Dict[str, List[Dict[str, Any]]] = {}
    pk_by_table: Dict[str, Set[str]] = {}
    fks_by_table: Dict[str, List[Dict[str, Any]]] = {}
    indexes_by_table: Dict[str, List[Dict[str, Any]]] = {}
    uniques_by_table: Dict[str, List[Dict[str, Any]]] = {}

    fk_edges: List[ForeignKeyEdge] = []

    total_rows = 0

    for table in table_names:
        table_rows[table] = get_row_count(engine, schema, table)
        total_rows += table_rows[table]

        columns = inspector.get_columns(table, schema=schema)
        columns_by_table[table] = columns

        pk_info = inspector.get_pk_constraint(table, schema=schema) or {}
        pk_cols = set(pk_info.get("constrained_columns") or [])
        pk_by_table[table] = pk_cols

        fks = inspector.get_foreign_keys(table, schema=schema) or []
        fks_by_table[table] = fks

        idx = inspector.get_indexes(table, schema=schema) or []
        indexes_by_table[table] = idx

        uniq = inspector.get_unique_constraints(table, schema=schema) or []
        uniques_by_table[table] = uniq

        for fk in fks:
            referred_schema = fk.get("referred_schema") or schema or ""
            edge = ForeignKeyEdge(
                source_schema=schema or "",
                source_table=table,
                source_columns="|".join(fk.get("constrained_columns") or []),
                target_schema=referred_schema,
                target_table=fk.get("referred_table") or "",
                target_columns="|".join(fk.get("referred_columns") or []),
                constraint_name=fk.get("name") or "",
                on_update=str((fk.get("options") or {}).get("onupdate", "")),
                on_delete=str((fk.get("options") or {}).get("ondelete", "")),
            )
            fk_edges.append(edge)

    levels = build_dependency_levels(table_names, fk_edges)

    column_to_indexes: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for table, idxs in indexes_by_table.items():
        for idx in idxs:
            idx_name = idx.get("name") or ""
            for col in idx.get("column_names") or []:
                column_to_indexes[(table, col)].append(idx_name)

    unique_columns_lookup: Dict[Tuple[str, str], bool] = defaultdict(bool)
    for table, uqs in uniques_by_table.items():
        for uq in uqs:
            cols = uq.get("column_names") or []
            if len(cols) == 1:
                unique_columns_lookup[(table, cols[0])] = True

    # 1) database_summary.csv
    db_summary_rows = [
        (
            datetime.now(timezone.utc).isoformat(),
            dialect,
            schema or "(default)",
            len(table_names),
            total_rows,
            sum(len(columns_by_table[t]) for t in table_names),
            sum(len(fks_by_table[t]) for t in table_names),
            sum(len(indexes_by_table[t]) for t in table_names),
            sum(len(uniques_by_table[t]) for t in table_names),
        )
    ]
    write_csv(
        out_dir / "database_summary.csv",
        [
            "generated_at_utc",
            "dialect",
            "schema",
            "table_count",
            "total_rows",
            "total_columns",
            "total_foreign_keys",
            "total_indexes",
            "total_unique_constraints",
        ],
        db_summary_rows,
    )

    # 2) table_overview.csv
    table_overview_rows = []
    for table in table_names:
        cols = columns_by_table[table]
        nullable_cols = sum(1 for c in cols if c.get("nullable", True))
        table_overview_rows.append(
            (
                schema or "",
                table,
                table_rows[table],
                len(cols),
                len(pk_by_table[table]),
                len(fks_by_table[table]),
                len(indexes_by_table[table]),
                len(uniques_by_table[table]),
                nullable_cols,
                len(cols) - nullable_cols,
                levels.get(table, 0),
                model_mapping.get(table, {}).get("model_class", ""),
                model_mapping.get(table, {}).get("model_module", ""),
            )
        )
    write_csv(
        out_dir / "table_overview.csv",
        [
            "schema",
            "table_name",
            "row_count",
            "column_count",
            "primary_key_column_count",
            "foreign_key_count",
            "index_count",
            "unique_constraint_count",
            "nullable_column_count",
            "not_nullable_column_count",
            "dependency_level",
            "app_model_class",
            "app_model_module",
        ],
        table_overview_rows,
    )

    # 3) columns_detail.csv
    columns_rows = []
    for table in table_names:
        for ordinal, col in enumerate(columns_by_table[table], start=1):
            col_name = col.get("name", "")
            col_type = str(col.get("type", ""))
            fk_targets = []
            for fk in fks_by_table[table]:
                constrained = fk.get("constrained_columns") or []
                referred_table = fk.get("referred_table") or ""
                referred_cols = fk.get("referred_columns") or []
                if col_name in constrained:
                    idx = constrained.index(col_name)
                    referred_col = referred_cols[idx] if idx < len(referred_cols) else ""
                    fk_targets.append(f"{referred_table}.{referred_col}")

            columns_rows.append(
                (
                    schema or "",
                    table,
                    ordinal,
                    col_name,
                    col_type,
                    bool(col.get("nullable", True)),
                    str(col.get("default", "")),
                    col_name in pk_by_table[table],
                    bool(fk_targets),
                    "|".join(fk_targets),
                    "|".join(column_to_indexes.get((table, col_name), [])),
                    bool(column_to_indexes.get((table, col_name))),
                    bool(unique_columns_lookup.get((table, col_name), False)),
                )
            )

    write_csv(
        out_dir / "columns_detail.csv",
        [
            "schema",
            "table_name",
            "ordinal_position",
            "column_name",
            "column_type",
            "is_nullable",
            "default_value",
            "is_primary_key",
            "is_foreign_key",
            "foreign_key_targets",
            "indexes_on_column",
            "is_indexed",
            "is_single_column_unique",
        ],
        columns_rows,
    )

    # 4) foreign_keys.csv
    fk_rows = [
        (
            e.source_schema,
            e.source_table,
            e.source_columns,
            e.target_schema,
            e.target_table,
            e.target_columns,
            e.constraint_name,
            e.on_update,
            e.on_delete,
        )
        for e in fk_edges
    ]
    write_csv(
        out_dir / "foreign_keys.csv",
        [
            "source_schema",
            "source_table",
            "source_columns",
            "target_schema",
            "target_table",
            "target_columns",
            "constraint_name",
            "on_update",
            "on_delete",
        ],
        fk_rows,
    )

    # 5) index_inventory.csv
    idx_rows = []
    for table in table_names:
        for idx in indexes_by_table[table]:
            idx_rows.append(
                (
                    schema or "",
                    table,
                    idx.get("name") or "",
                    "|".join(idx.get("column_names") or []),
                    bool(idx.get("unique", False)),
                )
            )
    write_csv(
        out_dir / "index_inventory.csv",
        [
            "schema",
            "table_name",
            "index_name",
            "column_names",
            "is_unique",
        ],
        idx_rows,
    )

    # 6) unique_constraints.csv
    uq_rows = []
    for table in table_names:
        for uq in uniques_by_table[table]:
            uq_rows.append(
                (
                    schema or "",
                    table,
                    uq.get("name") or "",
                    "|".join(uq.get("column_names") or []),
                )
            )
    write_csv(
        out_dir / "unique_constraints.csv",
        ["schema", "table_name", "constraint_name", "column_names"],
        uq_rows,
    )

    # 7) dependency_hierarchy.csv
    dep_rows = []
    for table in table_names:
        incoming = [e for e in fk_edges if e.source_table == table]
        outgoing = [e for e in fk_edges if e.target_table == table]
        dep_rows.append(
            (
                schema or "",
                table,
                levels.get(table, 0),
                len(incoming),
                len(outgoing),
                "|".join(sorted({e.target_table for e in incoming})),
                "|".join(sorted({e.source_table for e in outgoing})),
            )
        )
    write_csv(
        out_dir / "dependency_hierarchy.csv",
        [
            "schema",
            "table_name",
            "dependency_level",
            "depends_on_table_count",
            "referenced_by_table_count",
            "depends_on_tables",
            "referenced_by_tables",
        ],
        dep_rows,
    )

    # 8) app_model_mapping.csv
    model_rows = []
    for table in sorted(model_mapping):
        row_count = table_rows.get(table)
        model_rows.append(
            (
                table,
                model_mapping[table]["model_class"],
                model_mapping[table]["model_module"],
                "yes" if table in table_rows else "no",
                "" if row_count is None else row_count,
            )
        )
    write_csv(
        out_dir / "app_model_mapping.csv",
        [
            "table_name",
            "model_class",
            "model_module",
            "table_present_in_database",
            "table_row_count",
        ],
        model_rows,
    )

    # 9) normalization_signals.csv
    norm_rows = []
    for table in table_names:
        cols = columns_by_table[table]
        col_names = [c.get("name", "") for c in cols]

        non_key_cols = [c for c in col_names if c not in pk_by_table[table]]

        denorm_like = [
            c
            for c in col_names
            if c.endswith("_ids") or c.endswith("_json") or c.startswith("json_")
        ]

        text_blob_like = [
            c
            for c in cols
            if "TEXT" in str(c.get("type", "")).upper() and c.get("name", "").endswith("_ids")
        ]

        norm_rows.append(
            (
                schema or "",
                table,
                "yes" if bool(pk_by_table[table]) else "no",
                len(pk_by_table[table]),
                len(non_key_cols),
                len(fks_by_table[table]),
                len(denorm_like),
                "|".join(denorm_like),
                len(text_blob_like),
                "heuristic_only",
                "Potential denormalization if *_ids or JSON-like columns store multiple values.",
            )
        )

    write_csv(
        out_dir / "normalization_signals.csv",
        [
            "schema",
            "table_name",
            "has_primary_key",
            "primary_key_column_count",
            "non_key_column_count",
            "foreign_key_count",
            "denormalization_signal_count",
            "denormalization_signal_columns",
            "text_blob_ids_count",
            "analysis_type",
            "notes",
        ],
        norm_rows,
    )

    # 10) data_presence_overview.csv
    presence_rows = []
    for table in table_names:
        cols = columns_by_table[table]
        row_count = table_rows[table]
        mandatory = [c for c in cols if not c.get("nullable", True)]
        nullable = [c for c in cols if c.get("nullable", True)]

        presence_rows.append(
            (
                schema or "",
                table,
                row_count,
                len(cols),
                len(mandatory),
                len(nullable),
                "populated" if row_count > 0 else "empty",
            )
        )

    write_csv(
        out_dir / "data_presence_overview.csv",
        [
            "schema",
            "table_name",
            "row_count",
            "total_columns",
            "mandatory_columns",
            "nullable_columns",
            "data_state",
        ],
        presence_rows,
    )

    # 11) relationship_edges.csv (graph-friendly)
    rel_rows = [
        (
            e.source_table,
            e.target_table,
            e.source_columns,
            e.target_columns,
            e.constraint_name,
        )
        for e in fk_edges
    ]
    write_csv(
        out_dir / "relationship_edges.csv",
        ["source_table", "target_table", "source_columns", "target_columns", "constraint_name"],
        rel_rows,
    )

    # 12) column_quality_profile.csv
    quality_rows = []
    for table in table_names:
        row_count = table_rows[table]
        for col in columns_by_table[table]:
            col_name = col.get("name", "")
            (
                null_count,
                non_null_count,
                null_pct,
                distinct_non_null,
                distinct_ratio,
                status,
            ) = profile_column_quality(engine, schema, table, col_name, row_count)

            quality_rows.append(
                (
                    schema or "",
                    table,
                    col_name,
                    row_count,
                    null_count,
                    non_null_count,
                    null_pct,
                    "" if distinct_non_null is None else distinct_non_null,
                    "" if distinct_ratio is None else round(distinct_ratio * 100.0, 4),
                    status,
                )
            )

    write_csv(
        out_dir / "column_quality_profile.csv",
        [
            "schema",
            "table_name",
            "column_name",
            "table_row_count",
            "null_count",
            "non_null_count",
            "null_percentage",
            "distinct_non_null_count",
            "distinct_non_null_percentage",
            "profile_status",
        ],
        quality_rows,
    )

    # Create ZIP bundle for easy download/share.
    zip_path = out_dir.with_suffix(".zip")
    make_zip(out_dir, zip_path)

    # Create a single workbook containing all CSV outputs as separate sheets.
    workbook_path = out_dir.with_suffix(".xlsx")
    make_workbook_from_csvs(out_dir, workbook_path)

    print("=" * 80)
    print("Database overview export complete")
    print("=" * 80)
    print(f"Schema: {schema or '(default)'}")
    print(f"Tables scanned: {len(table_names)}")
    print(f"Total rows across tables: {total_rows}")
    print(f"CSV output directory: {out_dir}")
    print(f"ZIP bundle: {zip_path}")
    print(f"Excel workbook (all sheets): {workbook_path}")
    print("CSV files generated:")
    for csv_file in sorted(out_dir.glob("*.csv")):
        print(f"  - {csv_file.name}")


if __name__ == "__main__":
    main()
