"""
Export comprehensive frontend/backend feature inventory and UI/style mapping.

Outputs:
- CSV pack with backend + frontend + CSS + dependency analysis
- One Excel workbook with each CSV as a separate sheet

Usage:
    python scripts/utilities/export_codebase_overview.py
    python scripts/utilities/export_codebase_overview.py --output-dir reports
"""

from __future__ import annotations

import argparse
import csv
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Set, Tuple

from openpyxl import Workbook


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1", errors="ignore")


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(list(row))


def make_zip(output_dir: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(output_dir.glob("*.csv")):
            zf.write(file_path, arcname=file_path.name)


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
        suffix_txt = f"_{suffix}"
        trimmed = cleaned[: 31 - len(suffix_txt)]
        candidate = f"{trimmed}{suffix_txt}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        suffix += 1


def make_workbook_from_csvs(output_dir: Path, workbook_path: Path) -> None:
    wb = Workbook()
    wb.remove(wb.active)

    used_names: Set[str] = set()
    for csv_file in sorted(output_dir.glob("*.csv")):
        sheet_name = safe_sheet_name(csv_file.stem, used_names)
        ws = wb.create_sheet(title=sheet_name)
        with csv_file.open("r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                ws.append(row)
        ws.freeze_panes = "A2"

    wb.save(workbook_path)


def all_files(base: Path, patterns: Sequence[str]) -> List[Path]:
    found: List[Path] = []
    for pattern in patterns:
        found.extend(base.rglob(pattern))
    return sorted([p for p in found if p.is_file()])


def relative_to(path: Path, base: Path) -> str:
    return str(path.relative_to(base)).replace("\\", "/")


def guess_feature_from_path(path_str: str) -> str:
    normalized = path_str.lower()
    if "recommend" in normalized:
        return "recommendations"
    if "auth" in normalized:
        return "authentication"
    if "meeting" in normalized or "calendar" in normalized:
        return "meetings"
    if "notification" in normalized:
        return "notifications"
    if "dashboard" in normalized:
        return "dashboard"
    if "job" in normalized:
        return "jobs"
    if "candidate" in normalized:
        return "candidates"
    if "company" in normalized or "team" in normalized:
        return "company/team"
    if "admin" in normalized:
        return "admin"
    if "chat" in normalized or "message" in normalized:
        return "messaging"
    if "taxonom" in normalized:
        return "taxonomy"
    return "general"


def analyze_backend(backend_root: Path, repo_root: Path) -> Dict[str, List[Tuple[Any, ...]]]:
    app_root = backend_root / "app"
    py_files = all_files(app_root, ["*.py"])

    endpoint_rows: List[Tuple[Any, ...]] = []
    module_rows: List[Tuple[Any, ...]] = []
    import_rows: List[Tuple[Any, ...]] = []

    route_pattern = re.compile(
        r"@(\w+)\.(get|post|put|patch|delete|options|head)\(\s*[\"']([^\"']+)",
        re.IGNORECASE,
    )
    fn_pattern = re.compile(r"^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", re.MULTILINE)
    class_pattern = re.compile(r"^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(?", re.MULTILINE)
    import_pattern = re.compile(
        r"^\s*(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))",
        re.MULTILINE,
    )

    for py_file in py_files:
        rel = relative_to(py_file, repo_root)
        text = read_text(py_file)

        functions = fn_pattern.findall(text)
        classes = class_pattern.findall(text)
        lines = text.count("\n") + 1

        module_rows.append(
            (
                rel,
                "routers" if "/routers/" in rel else "services" if "/services/" in rel else "models" if rel.endswith("/models.py") else "core",
                guess_feature_from_path(rel),
                lines,
                len(classes),
                len(functions),
                "|".join(classes[:20]),
                "|".join(functions[:30]),
            )
        )

        for router_var, method, route in route_pattern.findall(text):
            endpoint_rows.append(
                (
                    rel,
                    router_var,
                    method.upper(),
                    route,
                    guess_feature_from_path(rel),
                )
            )

        for frm, imp in import_pattern.findall(text):
            target = frm or imp
            if target.startswith("app"):
                import_rows.append((rel, target, "internal"))
            else:
                import_rows.append((rel, target, "external"))

    return {
        "backend_endpoints": sorted(endpoint_rows),
        "backend_modules": sorted(module_rows),
        "backend_imports": sorted(import_rows),
    }


def parse_ts_imports(text: str) -> List[Tuple[str, str, str]]:
    """Return tuples of (import_spec, source, kind)."""
    rows: List[Tuple[str, str, str]] = []
    pattern = re.compile(r"import\s+(.+?)\s+from\s+[\"']([^\"']+)[\"']", re.MULTILINE)
    for spec, source in pattern.findall(text):
        kind = "relative" if source.startswith(".") else "package"
        rows.append((spec.strip(), source.strip(), kind))
    return rows


def extract_exported_component_names(text: str) -> List[str]:
    names: Set[str] = set()
    for match in re.findall(r"export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)", text):
        names.add(match)
    for match in re.findall(r"export\s+function\s+([A-Z][A-Za-z0-9_]*)", text):
        names.add(match)
    for match in re.findall(r"const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(", text):
        if re.search(rf"export\s+default\s+{re.escape(match)}", text) or re.search(rf"export\s+\{{[^}}]*\b{re.escape(match)}\b[^}}]*\}}", text):
            names.add(match)
    return sorted(names)


def extract_jsx_component_tags(text: str) -> List[str]:
    tags = re.findall(r"<([A-Z][A-Za-z0-9_]*)\b", text)
    return sorted(set(tags))


def extract_routes(app_text: str) -> List[Tuple[str, str]]:
    routes: List[Tuple[str, str]] = []
    route_pattern = re.compile(
        r"<Route\s+path=[\"']([^\"']+)[\"'][^>]*element=\{\s*<([A-Z][A-Za-z0-9_]*)",
        re.MULTILINE,
    )
    for path, comp in route_pattern.findall(app_text):
        routes.append((path, comp))
    return routes


def analyze_css_file(css_text: str) -> Tuple[int, int, int, int, List[str]]:
    lines = css_text.count("\n") + 1
    vars_found = re.findall(r"--([a-zA-Z0-9_-]+)\s*:", css_text)
    class_selectors = re.findall(r"\.([a-zA-Z_-][a-zA-Z0-9_-]*)", css_text)
    ids = re.findall(r"#([a-zA-Z_-][a-zA-Z0-9_-]*)", css_text)

    # Keep class names unique and avoid pseudo selectors noise.
    class_names = sorted(set([c for c in class_selectors if c and not c[0].isdigit()]))

    return lines, len(class_names), len(vars_found), len(ids), class_names


def extract_used_css_classes(tsx_text: str) -> Set[str]:
    used: Set[str] = set()

    # className="a b" and className='a b'
    for value in re.findall(r"className\s*=\s*[\"']([^\"']+)[\"']", tsx_text):
        for cls in re.split(r"\s+", value.strip()):
            if cls:
                used.add(cls)

    # className={`a ${x} b`} -> pull static tokens
    for value in re.findall(r"className\s*=\s*\{`([^`]+)`\}", tsx_text):
        for token in re.split(r"\s+|\$\{[^}]+\}", value.strip()):
            token = token.strip()
            if token:
                used.add(token)

    return used


def analyze_frontend(frontend_root: Path, repo_root: Path, app_name: str) -> Dict[str, List[Tuple[Any, ...]]]:
    src = frontend_root / "src"
    tsx_files = all_files(src, ["*.tsx", "*.ts"])
    css_files = all_files(src, ["*.css", "*.scss"])

    page_rows: List[Tuple[Any, ...]] = []
    component_rows: List[Tuple[Any, ...]] = []
    route_rows: List[Tuple[Any, ...]] = []
    import_rows: List[Tuple[Any, ...]] = []
    css_rows: List[Tuple[Any, ...]] = []
    comp_usage_rows: List[Tuple[Any, ...]] = []
    comp_style_rows: List[Tuple[Any, ...]] = []
    css_usage_rows: List[Tuple[Any, ...]] = []

    exported_by_file: Dict[str, List[str]] = {}
    used_tags_by_file: Dict[str, List[str]] = {}
    css_classes_by_file: Dict[str, Set[str]] = {}

    for file_path in tsx_files:
        rel = relative_to(file_path, repo_root)
        text = read_text(file_path)
        lines = text.count("\n") + 1

        exports = extract_exported_component_names(text)
        exported_by_file[rel] = exports

        jsx_tags = extract_jsx_component_tags(text)
        used_tags_by_file[rel] = jsx_tags

        imports = parse_ts_imports(text)
        for spec, source, kind in imports:
            import_rows.append((app_name, rel, spec, source, kind))

        imported_css = [src_imp for _, src_imp, _ in imports if src_imp.endswith(".css") or src_imp.endswith(".scss")]
        if exports:
            for component_name in exports:
                comp_style_rows.append(
                    (
                        app_name,
                        rel,
                        component_name,
                        "|".join(imported_css),
                    )
                )

        # classify file role
        role = "component"
        if "/pages/" in rel or rel.endswith("Page.tsx"):
            role = "page"

        if role == "page":
            page_rows.append((app_name, rel, "|".join(exports), lines, guess_feature_from_path(rel)))

        if exports:
            component_rows.append(
                (
                    app_name,
                    rel,
                    role,
                    "|".join(exports),
                    lines,
                    guess_feature_from_path(rel),
                )
            )

        used_classes = extract_used_css_classes(text)
        css_classes_by_file[rel] = used_classes

        if file_path.name == "App.tsx":
            for route_path, element_component in extract_routes(text):
                route_rows.append((app_name, rel, route_path, element_component))

    # Build component usage map from exported names.
    component_catalog: Dict[str, str] = {}
    for rel, names in exported_by_file.items():
        for name in names:
            component_catalog[name] = rel

    for consumer_file, tags in used_tags_by_file.items():
        for tag in tags:
            provider = component_catalog.get(tag, "")
            comp_usage_rows.append((app_name, tag, provider, consumer_file))

    # CSS inventory and usage map.
    all_classes: Dict[str, Set[str]] = {}
    for css_file in css_files:
        rel = relative_to(css_file, repo_root)
        css_text = read_text(css_file)
        lines, class_count, var_count, id_count, class_names = analyze_css_file(css_text)
        css_rows.append((app_name, rel, lines, class_count, var_count, id_count, guess_feature_from_path(rel)))
        all_classes[rel] = set(class_names)

    for ts_file, used in css_classes_by_file.items():
        for css_file, css_classes in all_classes.items():
            overlap = sorted(used.intersection(css_classes))
            if overlap:
                css_usage_rows.append(
                    (
                        app_name,
                        ts_file,
                        css_file,
                        len(overlap),
                        "|".join(overlap[:100]),
                    )
                )

    return {
        "frontend_pages": sorted(page_rows),
        "frontend_components": sorted(component_rows),
        "frontend_routes": sorted(route_rows),
        "frontend_imports": sorted(import_rows),
        "frontend_component_usage": sorted(comp_usage_rows),
        "frontend_component_styles": sorted(comp_style_rows),
        "css_inventory": sorted(css_rows),
        "css_class_usage_map": sorted(css_usage_rows),
    }


def merge_rows(data_dicts: Sequence[Dict[str, List[Tuple[Any, ...]]]]) -> Dict[str, List[Tuple[Any, ...]]]:
    merged: Dict[str, List[Tuple[Any, ...]]] = {}
    for d in data_dicts:
        for key, rows in d.items():
            merged.setdefault(key, []).extend(rows)
    for key in merged:
        merged[key] = sorted(merged[key])
    return merged


def main() -> None:
    parser = argparse.ArgumentParser(description="Export frontend/backend feature inventory")
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Base output directory (default: backend2/reports)",
    )
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[2]
    repo_root = backend_root.parent

    frontend_root = repo_root / "frontend2"
    admin_root = repo_root / "admin-ui"

    output_base = Path(args.output_dir).resolve() if args.output_dir else (backend_root / "reports")
    stamp = utc_stamp()
    out_dir = output_base / f"codebase_overview_{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    backend_data = analyze_backend(backend_root, repo_root)
    frontend_data = analyze_frontend(frontend_root, repo_root, "frontend2")
    admin_data = analyze_frontend(admin_root, repo_root, "admin-ui")

    merged_frontend = merge_rows([frontend_data, admin_data])

    summary_rows = [
        (
            datetime.now(timezone.utc).isoformat(),
            len(backend_data["backend_modules"]),
            len(backend_data["backend_endpoints"]),
            len(backend_data["backend_imports"]),
            len(merged_frontend["frontend_pages"]),
            len(merged_frontend["frontend_components"]),
            len(merged_frontend["frontend_routes"]),
            len(merged_frontend["frontend_imports"]),
            len(merged_frontend["css_inventory"]),
            len(merged_frontend["css_class_usage_map"]),
        )
    ]

    write_csv(
        out_dir / "project_feature_summary.csv",
        [
            "generated_at_utc",
            "backend_module_files",
            "backend_api_endpoints",
            "backend_import_edges",
            "frontend_page_files",
            "frontend_component_files",
            "frontend_routes",
            "frontend_import_edges",
            "css_files",
            "css_usage_links",
        ],
        summary_rows,
    )

    write_csv(
        out_dir / "backend_modules.csv",
        [
            "file",
            "category",
            "feature_area",
            "line_count",
            "class_count",
            "function_count",
            "classes",
            "functions",
        ],
        backend_data["backend_modules"],
    )

    write_csv(
        out_dir / "backend_endpoints.csv",
        ["file", "router_variable", "http_method", "route_path", "feature_area"],
        backend_data["backend_endpoints"],
    )

    write_csv(
        out_dir / "backend_import_dependencies.csv",
        ["source_file", "import_target", "dependency_type"],
        backend_data["backend_imports"],
    )

    write_csv(
        out_dir / "frontend_pages.csv",
        ["app", "file", "exported_components", "line_count", "feature_area"],
        merged_frontend["frontend_pages"],
    )

    write_csv(
        out_dir / "frontend_components.csv",
        ["app", "file", "role", "exported_components", "line_count", "feature_area"],
        merged_frontend["frontend_components"],
    )

    write_csv(
        out_dir / "frontend_routes.csv",
        ["app", "app_file", "route_path", "route_component"],
        merged_frontend["frontend_routes"],
    )

    write_csv(
        out_dir / "frontend_import_dependencies.csv",
        ["app", "source_file", "import_spec", "import_source", "import_kind"],
        merged_frontend["frontend_imports"],
    )

    write_csv(
        out_dir / "frontend_component_usage_map.csv",
        ["app", "component", "component_definition_file", "used_in_file"],
        merged_frontend["frontend_component_usage"],
    )

    write_csv(
        out_dir / "frontend_component_styles.csv",
        ["app", "component_file", "component_name", "imported_style_files"],
        merged_frontend["frontend_component_styles"],
    )

    write_csv(
        out_dir / "css_inventory.csv",
        ["app", "css_file", "line_count", "class_selector_count", "css_variable_count", "id_selector_count", "feature_area"],
        merged_frontend["css_inventory"],
    )

    write_csv(
        out_dir / "css_class_usage_map.csv",
        ["app", "frontend_file", "css_file", "overlap_class_count", "overlap_classes"],
        merged_frontend["css_class_usage_map"],
    )

    zip_path = out_dir.with_suffix(".zip")
    make_zip(out_dir, zip_path)

    workbook_path = out_dir.with_suffix(".xlsx")
    make_workbook_from_csvs(out_dir, workbook_path)

    print("=" * 80)
    print("Codebase overview export complete")
    print("=" * 80)
    print(f"Output directory: {out_dir}")
    print(f"ZIP bundle: {zip_path}")
    print(f"Workbook (all sheets): {workbook_path}")
    print("CSV files generated:")
    for csv_file in sorted(out_dir.glob("*.csv")):
        print(f"  - {csv_file.name}")


if __name__ == "__main__":
    main()
