"""Pydantic models for CodeGraph database entities."""

from __future__ import annotations

from pydantic import BaseModel, Field


class NodeSummary(BaseModel):
    """Lightweight node representation for listings and graph views."""

    id: str
    kind: str
    name: str
    qualified_name: str
    file_path: str
    language: str
    start_line: int
    end_line: int


class NodeDetail(NodeSummary):
    """Full node representation including all metadata columns."""

    start_column: int
    end_column: int
    docstring: str | None = None
    signature: str | None = None
    visibility: str | None = None
    is_exported: bool = False
    is_async: bool = False
    is_static: bool = False
    is_abstract: bool = False
    decorators: list[str] = Field(default_factory=list)
    type_parameters: list[str] = Field(default_factory=list)


class EdgeData(BaseModel):
    """Edge between two nodes."""

    id: int
    source: str
    target: str
    kind: str
    metadata: dict | None = None
    line: int | None = None
    col: int | None = None
    provenance: str | None = None
    source_name: str | None = None
    target_name: str | None = None


class GraphStats(BaseModel):
    """Aggregate statistics about the graph."""

    total_nodes: int
    total_edges: int
    nodes_by_kind: dict[str, int]
    edges_by_kind: dict[str, int]
    languages: dict[str, int]
    files_count: int


class GraphData(BaseModel):
    """Full graph payload for visualization."""

    nodes: list[NodeSummary]
    edges: list[EdgeData]
    stats: GraphStats


class GraphFilter(BaseModel):
    """Filters applied when querying the graph."""

    node_kinds: list[str] | None = None
    edge_kinds: list[str] | None = None
    file_paths: list[str] | None = None
    exclude_imports: bool = False
    exclude_contains: bool = False
    min_connections: int = 0


class SearchResult(BaseModel):
    """A single search hit with ranking information."""

    node: NodeSummary
    rank: float
    snippet: str | None = None


class ImpactNode(BaseModel):
    """A node affected by a change, with distance and path from root."""

    node: NodeSummary
    distance: int
    path: list[str]
    edge_kind: str


class ImpactResult(BaseModel):
    """Impact analysis result rooted at a specific node."""

    root: str
    affected: list[ImpactNode]
    depth: int


class TracePath(BaseModel):
    """A single path between two nodes through the graph."""

    nodes: list[NodeSummary]
    edges: list[EdgeData]


class FileInfo(BaseModel):
    """Metadata about an indexed file."""

    path: str
    language: str
    size: int
    node_count: int
    modified_at: int


class FileTreeNode(BaseModel):
    """Recursive tree structure representing the project file hierarchy."""

    name: str
    path: str
    is_dir: bool
    children: list[FileTreeNode] | None = None
    node_count: int = 0
