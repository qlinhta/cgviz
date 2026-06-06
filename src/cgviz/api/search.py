"""Search endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from cgviz.db.models import SearchResult

router = APIRouter()


@router.get("/search", response_model=list[SearchResult])
async def search(
    request: Request,
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=200),
) -> list[SearchResult]:
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' must not be empty")
    db = request.app.state.db
    return await db.search(q, limit=limit)
