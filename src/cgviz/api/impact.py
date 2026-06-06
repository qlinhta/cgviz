"""Impact analysis endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from cgviz.db.models import ImpactResult

router = APIRouter()


@router.get("/impact/{node_id:path}", response_model=ImpactResult)
async def get_impact(
    request: Request,
    node_id: str,
    depth: int = Query(3, ge=1, le=10),
) -> ImpactResult:
    db = request.app.state.db
    return await db.get_impact(node_id, depth=depth)
