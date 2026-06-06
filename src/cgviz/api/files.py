"""File listing and tree endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

from cgviz.db.models import FileInfo, FileTreeNode

router = APIRouter()


@router.get("/files", response_model=list[FileInfo])
async def list_files(request: Request) -> list[FileInfo]:
    db = request.app.state.db
    return await db.get_files()


@router.get("/files/tree", response_model=FileTreeNode)
async def get_file_tree(request: Request) -> FileTreeNode:
    db = request.app.state.db
    return await db.get_file_tree()
