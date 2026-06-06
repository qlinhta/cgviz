"""Graph endpoints: full graph data and stats."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from cgviz.db.models import GraphData, GraphFilter, GraphStats

router = APIRouter()


@router.get("/graph", response_model=GraphData)
async def get_graph(
    request: Request,
    node_kinds: str | None = Query(None, description="Comma-separated node kinds"),
    edge_kinds: str | None = Query(None, description="Comma-separated edge kinds"),
    file_paths: str | None = Query(None, description="Comma-separated file path prefixes"),
    exclude_imports: bool = Query(False),
    exclude_contains: bool = Query(False),
    min_connections: int = Query(0, ge=0),
) -> GraphData:
    filters = GraphFilter(
        node_kinds=node_kinds.split(",") if node_kinds else None,
        edge_kinds=edge_kinds.split(",") if edge_kinds else None,
        file_paths=file_paths.split(",") if file_paths else None,
        exclude_imports=exclude_imports,
        exclude_contains=exclude_contains,
        min_connections=min_connections,
    )
    db = request.app.state.db
    return await db.get_graph(filters)


@router.get("/graph/stats", response_model=GraphStats)
async def get_stats(request: Request) -> GraphStats:
    db = request.app.state.db
    return await db.get_stats()
