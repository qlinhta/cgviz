"""Async read-only interface to the CodeGraph SQLite database."""

from __future__ import annotations

import json
import logging
from collections import defaultdict
from pathlib import Path

import aiosqlite

from cgviz.db.models import (
    EdgeData,
    FileInfo,
    FileTreeNode,
    GraphData,
    GraphFilter,
    GraphStats,
    ImpactNode,
    ImpactResult,
    NodeDetail,
    NodeSummary,
    SearchResult,
    TracePath,
)
from cgviz.db import queries

logger = logging.getLogger(__name__)


class CodeGraphDB:
    """Async, read-only accessor for a CodeGraph SQLite database.

    Opens the database in WAL mode with a URI pointing at ``?mode=ro``
    so the file is never modified.
    """

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path.resolve()
        self._db: aiosqlite.Connection | None = None

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        """Open the database in read-only mode with WAL journal."""
        uri = f"file:{self.db_path}?mode=ro"
        self._db = await aiosqlite.connect(uri, uri=True)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA busy_timeout=5000")
        logger.info("Connected to CodeGraph DB at %s", self.db_path)

    async def close(self) -> None:
        """Close the database connection."""
        if self._db is not None:
            await self._db.close()
            self._db = None
            logger.info("Closed CodeGraph DB connection")

    @property
    def db(self) -> aiosqlite.Connection:
        if self._db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db

    # ------------------------------------------------------------------
    # Row converters
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_node_summary(row: aiosqlite.Row) -> NodeSummary:
        return NodeSummary(
            id=row["id"],
            kind=row["kind"],
            name=row["name"],
            qualified_name=row["qualified_name"],
            file_path=row["file_path"],
            language=row["language"],
            start_line=row["start_line"],
            end_line=row["end_line"],
        )

    @staticmethod
    def _row_to_node_detail(row: aiosqlite.Row) -> NodeDetail:
        raw_decorators = row["decorators"]
        decorators = json.loads(raw_decorators) if raw_decorators else []

        raw_type_params = row["type_parameters"]
        type_parameters = json.loads(raw_type_params) if raw_type_params else []

        return NodeDetail(
            id=row["id"],
            kind=row["kind"],
            name=row["name"],
            qualified_name=row["qualified_name"],
            file_path=row["file_path"],
            language=row["language"],
            start_line=row["start_line"],
            end_line=row["end_line"],
            start_column=row["start_column"],
            end_column=row["end_column"],
            docstring=row["docstring"],
            signature=row["signature"],
            visibility=row["visibility"],
            is_exported=bool(row["is_exported"]),
            is_async=bool(row["is_async"]),
            is_static=bool(row["is_static"]),
            is_abstract=bool(row["is_abstract"]),
            decorators=decorators,
            type_parameters=type_parameters,
        )

    @staticmethod
    def _row_to_edge(row: aiosqlite.Row) -> EdgeData:
        raw_meta = row["metadata"]
        metadata = json.loads(raw_meta) if raw_meta else None

        keys = row.keys()
        return EdgeData(
            id=row["id"],
            source=row["source"],
            target=row["target"],
            kind=row["kind"],
            metadata=metadata,
            line=row["line"],
            col=row["col"],
            provenance=row["provenance"],
            source_name=row["source_name"] if "source_name" in keys else None,
            target_name=row["target_name"] if "target_name" in keys else None,
        )

    # ------------------------------------------------------------------
    # Public query methods
    # ------------------------------------------------------------------

    async def get_graph(self, filters: GraphFilter | None = None) -> GraphData:
        """Retrieve the full graph, optionally filtered."""
        if filters is None:
            filters = GraphFilter()

        # --- Build node query ---
        kind_clause = ""
        file_clause = ""
        node_params: list = []

        if filters.node_kinds:
            placeholders = ", ".join("?" for _ in filters.node_kinds)
            kind_clause = f"AND kind IN ({placeholders})"
            node_params.extend(filters.node_kinds)

        if filters.file_paths:
            file_conditions = " OR ".join("file_path LIKE ?" for _ in filters.file_paths)
            file_clause = f"AND ({file_conditions})"
            node_params.extend(f"{fp}%" for fp in filters.file_paths)

        node_sql = queries.GET_GRAPH_NODES.format(
            kind_clause=kind_clause,
            file_clause=file_clause,
        )
        async with self.db.execute(node_sql, node_params) as cursor:
            node_rows = await cursor.fetchall()
        nodes = [self._row_to_node_summary(r) for r in node_rows]

        # --- If min_connections > 0, filter to well-connected nodes ---
        if filters.min_connections > 0:
            async with self.db.execute(
                queries.GET_CONNECTION_COUNTS, [filters.min_connections]
            ) as cursor:
                connected = {row["node_id"] for row in await cursor.fetchall()}
            nodes = [n for n in nodes if n.id in connected]

        node_ids = {n.id for n in nodes}

        # --- Build edge query ---
        edge_kind_clause = ""
        exclude_imports = ""
        exclude_contains = ""
        node_filter = ""
        edge_params: list = []

        if filters.edge_kinds:
            placeholders = ", ".join("?" for _ in filters.edge_kinds)
            edge_kind_clause = f"AND e.kind IN ({placeholders})"
            edge_params.extend(filters.edge_kinds)

        if filters.exclude_imports:
            exclude_imports = "AND e.kind != 'imports'"

        if filters.exclude_contains:
            exclude_contains = "AND e.kind != 'contains'"

        edge_sql = queries.GET_GRAPH_EDGES.format(
            kind_clause=edge_kind_clause,
            exclude_imports=exclude_imports,
            exclude_contains=exclude_contains,
            node_filter=node_filter,
        )
        async with self.db.execute(edge_sql, edge_params) as cursor:
            edge_rows = await cursor.fetchall()

        all_edges = [self._row_to_edge(r) for r in edge_rows]
        # Keep only edges whose endpoints are in the node set
        graph_edges = [e for e in all_edges if e.source in node_ids and e.target in node_ids]

        stats = await self.get_stats()
        return GraphData(nodes=nodes, edges=graph_edges, stats=stats)

    async def get_node(self, node_id: str) -> NodeDetail | None:
        """Retrieve full details for a single node by ID."""
        async with self.db.execute(queries.GET_NODE_BY_ID, [node_id]) as cursor:
            row = await cursor.fetchone()
        if row is None:
            return None
        return self._row_to_node_detail(row)

    async def get_nodes(
        self,
        kind: str | None = None,
        file_path: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[NodeSummary]:
        """List nodes with optional kind/file_path filtering and pagination."""
        kind_clause = ""
        file_clause = ""
        params: list = []

        if kind is not None:
            kind_clause = "AND kind = ?"
            params.append(kind)

        if file_path is not None:
            file_clause = "AND file_path LIKE ?"
            params.append(f"{file_path}%")

        params.extend([limit, offset])
        sql = queries.GET_NODES_FILTERED.format(
            kind_clause=kind_clause,
            file_clause=file_clause,
        )
        async with self.db.execute(sql, params) as cursor:
            rows = await cursor.fetchall()
        return [self._row_to_node_summary(r) for r in rows]

    async def get_edges(
        self,
        kind: str | None = None,
        source: str | None = None,
        target: str | None = None,
    ) -> list[EdgeData]:
        """List edges with optional kind/source/target filtering."""
        kind_clause = ""
        source_clause = ""
        target_clause = ""
        params: list = []

        if kind is not None:
            kind_clause = "AND kind = ?"
            params.append(kind)

        if source is not None:
            source_clause = "AND source = ?"
            params.append(source)

        if target is not None:
            target_clause = "AND target = ?"
            params.append(target)

        sql = queries.GET_EDGES_FILTERED.format(
            kind_clause=kind_clause,
            source_clause=source_clause,
            target_clause=target_clause,
        )
        async with self.db.execute(sql, params) as cursor:
            rows = await cursor.fetchall()
        return [self._row_to_edge(r) for r in rows]

    async def search(self, query: str, limit: int = 20) -> list[SearchResult]:
        """Full-text search for nodes. Falls back to LIKE if FTS5 is unavailable."""
        results: list[SearchResult] = []
        try:
            async with self.db.execute(queries.SEARCH_NODES, [query, limit]) as cursor:
                rows = await cursor.fetchall()
            for row in rows:
                node = self._row_to_node_summary(row)
                snippet = row["docstring"][:120] if row["docstring"] else None
                results.append(SearchResult(node=node, rank=row["rank"], snippet=snippet))
        except aiosqlite.OperationalError:
            # FTS5 table may not exist; fall back to LIKE
            like_pattern = f"%{query}%"
            async with self.db.execute(
                queries.SEARCH_NODES_FALLBACK, [like_pattern, like_pattern, limit]
            ) as cursor:
                rows = await cursor.fetchall()
            for row in rows:
                node = self._row_to_node_summary(row)
                snippet = row["docstring"][:120] if row["docstring"] else None
                results.append(SearchResult(node=node, rank=row["rank"], snippet=snippet))
        return results

    async def get_stats(self) -> GraphStats:
        """Compute aggregate statistics about the graph."""
        async with self.db.execute(queries.GET_NODE_COUNT) as cursor:
            total_nodes = (await cursor.fetchone())[0]

        async with self.db.execute(queries.GET_EDGE_COUNT) as cursor:
            total_edges = (await cursor.fetchone())[0]

        async with self.db.execute(queries.GET_FILE_COUNT) as cursor:
            files_count = (await cursor.fetchone())[0]

        async with self.db.execute(queries.GET_NODES_BY_KIND) as cursor:
            nodes_by_kind = {row["kind"]: row["cnt"] async for row in cursor}

        async with self.db.execute(queries.GET_EDGES_BY_KIND) as cursor:
            edges_by_kind = {row["kind"]: row["cnt"] async for row in cursor}

        async with self.db.execute(queries.GET_LANGUAGES) as cursor:
            languages = {row["language"]: row["cnt"] async for row in cursor}

        return GraphStats(
            total_nodes=total_nodes,
            total_edges=total_edges,
            nodes_by_kind=nodes_by_kind,
            edges_by_kind=edges_by_kind,
            languages=languages,
            files_count=files_count,
        )

    async def get_callers(self, node_id: str) -> list[EdgeData]:
        """Get all edges pointing *to* node_id (calls, imports, instantiates, extends)."""
        async with self.db.execute(queries.GET_CALLERS, [node_id]) as cursor:
            rows = await cursor.fetchall()
        return [self._row_to_edge(r) for r in rows]

    async def get_callees(self, node_id: str) -> list[EdgeData]:
        """Get all edges going *from* node_id (calls, imports, instantiates, extends)."""
        async with self.db.execute(queries.GET_CALLEES, [node_id]) as cursor:
            rows = await cursor.fetchall()
        return [self._row_to_edge(r) for r in rows]

    async def get_impact(self, node_id: str, depth: int = 3) -> ImpactResult:
        """BFS impact analysis: find all nodes that transitively depend on node_id."""
        async with self.db.execute(
            queries.IMPACT_QUERY, [node_id, node_id, depth]
        ) as cursor:
            rows = await cursor.fetchall()

        affected: list[ImpactNode] = []
        seen: set[str] = set()
        for row in rows:
            nid = row["node_id"]
            if nid in seen:
                continue
            seen.add(nid)
            node = NodeSummary(
                id=row["id"],
                kind=row["kind"],
                name=row["name"],
                qualified_name=row["qualified_name"],
                file_path=row["file_path"],
                language=row["language"],
                start_line=row["start_line"],
                end_line=row["end_line"],
            )
            path_str: str = row["path"]
            path_parts = path_str.split(">") if path_str else []
            affected.append(
                ImpactNode(
                    node=node,
                    distance=row["distance"],
                    path=path_parts,
                    edge_kind=row["edge_kind"],
                )
            )

        return ImpactResult(root=node_id, affected=affected, depth=depth)

    async def get_trace(
        self, from_id: str, to_id: str, max_depth: int = 10
    ) -> list[TracePath]:
        """Find paths from from_id to to_id via BFS up to max_depth hops."""
        async with self.db.execute(
            queries.TRACE_QUERY, [from_id, from_id, max_depth, to_id]
        ) as cursor:
            rows = await cursor.fetchall()

        if not rows:
            return []

        # Collect all unique node/edge IDs referenced across all paths
        all_node_ids: set[str] = set()
        all_edge_ids: set[int] = set()
        raw_paths: list[tuple[list[str], list[int]]] = []

        for row in rows:
            path_str: str = row["path"]
            edge_str: str = row["edge_ids"]
            node_ids = path_str.split(">") if path_str else []
            edge_ids = [int(e) for e in edge_str.split(",") if e] if edge_str else []
            all_node_ids.update(node_ids)
            all_edge_ids.update(edge_ids)
            raw_paths.append((node_ids, edge_ids))

        # Batch-fetch nodes
        node_map: dict[str, NodeSummary] = {}
        if all_node_ids:
            placeholders = ", ".join("?" for _ in all_node_ids)
            sql = queries.TRACE_GET_NODES.format(placeholders=placeholders)
            async with self.db.execute(sql, list(all_node_ids)) as cursor:
                for r in await cursor.fetchall():
                    node_map[r["id"]] = self._row_to_node_summary(r)

        # Batch-fetch edges
        edge_map: dict[int, EdgeData] = {}
        if all_edge_ids:
            placeholders = ", ".join("?" for _ in all_edge_ids)
            sql = queries.TRACE_GET_EDGES.format(placeholders=placeholders)
            async with self.db.execute(sql, list(all_edge_ids)) as cursor:
                for r in await cursor.fetchall():
                    edge_map[r["id"]] = self._row_to_edge(r)

        # Assemble TracePath objects
        trace_paths: list[TracePath] = []
        for node_ids, edge_ids in raw_paths:
            path_nodes = [node_map[nid] for nid in node_ids if nid in node_map]
            path_edges = [edge_map[eid] for eid in edge_ids if eid in edge_map]
            if path_nodes:
                trace_paths.append(TracePath(nodes=path_nodes, edges=path_edges))

        return trace_paths

    async def get_files(self) -> list[FileInfo]:
        """List all indexed files."""
        async with self.db.execute(queries.GET_FILES) as cursor:
            rows = await cursor.fetchall()
        return [
            FileInfo(
                path=row["path"],
                language=row["language"],
                size=row["size"],
                node_count=row["node_count"],
                modified_at=row["modified_at"],
            )
            for row in rows
        ]

    async def get_file_tree(self) -> FileTreeNode:
        """Build a hierarchical file tree from the flat file list."""
        async with self.db.execute(queries.GET_FILE_TREE) as cursor:
            rows = await cursor.fetchall()

        # Build an intermediate dict tree
        tree: dict = {}
        for row in rows:
            parts = Path(row["path"]).parts
            current = tree
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            # Leaf: store file info
            current[parts[-1]] = {
                "__file__": True,
                "path": row["path"],
                "language": row["language"],
                "node_count": row["node_count"],
            }

        def _build_tree_node(name: str, path: str, subtree: dict) -> FileTreeNode:
            if "__file__" in subtree:
                return FileTreeNode(
                    name=name,
                    path=subtree["path"],
                    is_dir=False,
                    node_count=subtree["node_count"],
                )

            children: list[FileTreeNode] = []
            total_count = 0
            for child_name, child_val in sorted(subtree.items()):
                child_path = f"{path}/{child_name}" if path else child_name
                child_node = _build_tree_node(child_name, child_path, child_val)
                children.append(child_node)
                total_count += child_node.node_count

            return FileTreeNode(
                name=name,
                path=path,
                is_dir=True,
                children=children,
                node_count=total_count,
            )

        return _build_tree_node(".", ".", tree)

    # ------------------------------------------------------------------
    # Async context manager
    # ------------------------------------------------------------------

    async def __aenter__(self) -> "CodeGraphDB":
        await self.connect()
        return self

    async def __aexit__(self, *exc) -> None:
        await self.close()
