"""
Shared helpers for the admin router modules (split out of the former
monolithic admin_extended.py): the admin-role auth guard, CSV export
utilities, and the bulk-action result model used by every domain's
bulk-action endpoint.
"""

import csv
import io
from typing import Any, List, Optional

from fastapi import Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..security import get_current_user

MAX_BULK_IDS = 100
MAX_EXPORT_ROWS = 50_000


# ─────────────────────────────────────────────────────────────────────────────
# Auth guard (shared with main admin router)
# ─────────────────────────────────────────────────────────────────────────────

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user



class BulkResult(BaseModel):
    id: int
    ok: bool
    error: Optional[str] = None


def _safe_csv_value(value: Any) -> str:
    """Prevent CSV formula injection by prefixing dangerous leading characters."""
    s = str(value) if value is not None else ""
    if s and s[0] in ("=", "+", "-", "@"):
        s = "'" + s
    return s

def _stream_csv(headers: List[str], rows: List[List[str]], filename: str) -> StreamingResponse:
    def generate():
        buf = io.StringIO()
        # UTF-8 BOM for spreadsheet compatibility
        buf.write("\ufeff")
        writer = csv.writer(buf)
        writer.writerow(headers)
        yield buf.getvalue()

        for row in rows:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([_safe_csv_value(v) for v in row])
            yield buf.getvalue()

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

