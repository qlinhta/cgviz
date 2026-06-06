"""Trace endpoint: find paths between two nodes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from cgviz.db.models import TracePath

router = APIRouter()


@router.get("/trace", response_model=list[TracePath])
async def get_trace(
    request: Request,
    from_id: str = Query(..., description="Source node ID"),
    to_id: str = Query(..., description="Target node ID"),
    max_depth: int = Query(10, ge=1, le=20),
) -> list[TracePath]:
    if not from_id.strip():
        raise HTTPException(status_code=400, detail="'from_id' must not be empty")
    if not to_id.strip():
        raise HTTPException(status_code=400, detail="'to_id' must not be empty")
    db = request.app.state.db
    return await db.get_trace(from_id, to_id, max_depth=max_depth)
