"""Main API router aggregating all sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from cgviz.api import edges, files, graph, impact, nodes, search, trace

router = APIRouter()

router.include_router(graph.router)
router.include_router(nodes.router)
router.include_router(edges.router)
router.include_router(search.router)
router.include_router(impact.router)
router.include_router(trace.router)
router.include_router(files.router)
