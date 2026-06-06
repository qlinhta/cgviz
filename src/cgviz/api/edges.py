"""Edge endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from cgviz.db.models import EdgeData

router = APIRouter()


@router.get("/edges", response_model=list[EdgeData])
async def list_edges(
    request: Request,
    kind: str | None = Query(None),
    source: str | None = Query(None),
    target: str | None = Query(None),
) -> list[EdgeData]:
    db = request.app.state.db
    return await db.get_edges(kind=kind, source=source, target=target)
