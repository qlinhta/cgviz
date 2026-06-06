"""Node endpoints: list, detail, callers, callees."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from cgviz.db.models import EdgeData, NodeDetail, NodeSummary

router = APIRouter()


@router.get("/nodes", response_model=list[NodeSummary])
async def list_nodes(
    request: Request,
    kind: str | None = Query(None),
    file_path: str | None = Query(None),
    limit: int = Query(500, ge=1, le=10000),
    offset: int = Query(0, ge=0),
) -> list[NodeSummary]:
    db = request.app.state.db
    return await db.get_nodes(kind=kind, file_path=file_path, limit=limit, offset=offset)


@router.get("/nodes/{node_id:path}/callers", response_model=list[EdgeData])
async def get_callers(request: Request, node_id: str) -> list[EdgeData]:
    db = request.app.state.db
    return await db.get_callers(node_id)


@router.get("/nodes/{node_id:path}/callees", response_model=list[EdgeData])
async def get_callees(request: Request, node_id: str) -> list[EdgeData]:
    db = request.app.state.db
    return await db.get_callees(node_id)


@router.get("/nodes/{node_id:path}", response_model=NodeDetail)
async def get_node(request: Request, node_id: str) -> NodeDetail:
    db = request.app.state.db
    node = await db.get_node(node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return node
