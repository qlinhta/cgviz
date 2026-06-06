"""SQL query constants for CodeGraph database operations.

All queries use parameterized placeholders (?) to prevent injection.
"""

# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

GET_ALL_NODES = """
SELECT id, kind, name, qualified_name, file_path, language, start_line, end_line
FROM nodes
ORDER BY file_path, start_line
"""

GET_NODE_BY_ID = """
SELECT id, kind, name, qualified_name, file_path, language,
       start_line, end_line, start_column, end_column,
       docstring, signature, visibility,
       is_exported, is_async, is_static, is_abstract,
       decorators, type_parameters
FROM nodes
WHERE id = ?
"""

GET_NODES_FILTERED = """
SELECT id, kind, name, qualified_name, file_path, language, start_line, end_line
FROM nodes
WHERE 1=1
  {kind_clause}
  {file_clause}
ORDER BY file_path, start_line
LIMIT ? OFFSET ?
"""

# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------

GET_ALL_EDGES = """
SELECT id, source, target, kind, metadata, line, col, provenance
FROM edges
ORDER BY source, target
"""

GET_EDGES_FILTERED = """
SELECT id, source, target, kind, metadata, line, col, provenance
FROM edges
WHERE 1=1
  {kind_clause}
  {source_clause}
  {target_clause}
ORDER BY source, target
"""

# ---------------------------------------------------------------------------
# Search (FTS5)
# ---------------------------------------------------------------------------

SEARCH_NODES = """
SELECT n.id, n.kind, n.name, n.qualified_name, n.file_path, n.language,
       n.start_line, n.end_line, f.rank, n.docstring
FROM nodes_fts f
JOIN nodes n ON f.id = n.id
WHERE nodes_fts MATCH ?
ORDER BY rank
LIMIT ?
"""

SEARCH_NODES_FALLBACK = """
SELECT id, kind, name, qualified_name, file_path, language,
       start_line, end_line, 0.0 AS rank, docstring
FROM nodes
WHERE name LIKE ? OR qualified_name LIKE ?
ORDER BY name
LIMIT ?
"""

# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

GET_NODE_COUNT = "SELECT COUNT(*) FROM nodes"

GET_EDGE_COUNT = "SELECT COUNT(*) FROM edges"

GET_FILE_COUNT = "SELECT COUNT(*) FROM files"

GET_NODES_BY_KIND = """
SELECT kind, COUNT(*) AS cnt
FROM nodes
GROUP BY kind
ORDER BY cnt DESC
"""

GET_EDGES_BY_KIND = """
SELECT kind, COUNT(*) AS cnt
FROM edges
GROUP BY kind
ORDER BY cnt DESC
"""

GET_LANGUAGES = """
SELECT language, COUNT(*) AS cnt
FROM nodes
WHERE language IS NOT NULL AND language != ''
GROUP BY language
ORDER BY cnt DESC
"""

# ---------------------------------------------------------------------------
# Callers / Callees
# ---------------------------------------------------------------------------

GET_CALLERS = """
SELECT e.id, e.source, e.target, e.kind, e.metadata, e.line, e.col, e.provenance,
       sn.name AS source_name, tn.name AS target_name
FROM edges e
LEFT JOIN nodes sn ON sn.id = e.source
LEFT JOIN nodes tn ON tn.id = e.target
WHERE e.target = ?
  AND e.kind IN ('calls', 'imports', 'instantiates', 'extends')
ORDER BY sn.name
"""

GET_CALLEES = """
SELECT e.id, e.source, e.target, e.kind, e.metadata, e.line, e.col, e.provenance,
       sn.name AS source_name, tn.name AS target_name
FROM edges e
LEFT JOIN nodes sn ON sn.id = e.source
LEFT JOIN nodes tn ON tn.id = e.target
WHERE e.source = ?
  AND e.kind IN ('calls', 'imports', 'instantiates', 'extends')
ORDER BY tn.name
"""

# ---------------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------------

GET_FILES = """
SELECT path, language, size, node_count, modified_at
FROM files
ORDER BY path
"""

GET_FILE_TREE = """
SELECT path, language, size, node_count, modified_at
FROM files
ORDER BY path
"""

# ---------------------------------------------------------------------------
# Impact analysis  (BFS via recursive CTE, reverse edges)
# ---------------------------------------------------------------------------

IMPACT_QUERY = """
WITH RECURSIVE impact(node_id, distance, path, edge_kind) AS (
    -- seed: the root node
    SELECT ?, 0, ?, ''

    UNION ALL

    -- expand: find nodes that call/import/instantiate/extend the current node
    SELECT e.source,
           i.distance + 1,
           i.path || '>' || e.source,
           e.kind
    FROM impact i
    JOIN edges e ON e.target = i.node_id
    WHERE e.kind IN ('calls', 'imports', 'instantiates', 'extends')
      AND i.distance < ?
      AND INSTR(i.path, e.source) = 0
)
SELECT DISTINCT
    i.node_id, i.distance, i.path, i.edge_kind,
    n.id, n.kind, n.name, n.qualified_name, n.file_path, n.language,
    n.start_line, n.end_line
FROM impact i
JOIN nodes n ON n.id = i.node_id
WHERE i.distance > 0
ORDER BY i.distance, n.file_path, n.start_line
"""

# ---------------------------------------------------------------------------
# Trace  (BFS path-finding from source to target via recursive CTE)
# ---------------------------------------------------------------------------

TRACE_QUERY = """
WITH RECURSIVE trace(node_id, distance, path, edge_ids) AS (
    -- seed: start from source
    SELECT ?, 0, ?, ''

    UNION ALL

    -- expand forward edges
    SELECT e.target,
           t.distance + 1,
           t.path || '>' || e.target,
           CASE WHEN t.edge_ids = '' THEN CAST(e.id AS TEXT)
                ELSE t.edge_ids || ',' || CAST(e.id AS TEXT)
           END
    FROM trace t
    JOIN edges e ON e.source = t.node_id
    WHERE e.kind IN ('calls', 'imports', 'instantiates', 'extends')
      AND t.distance < ?
      AND INSTR(t.path, e.target) = 0
)
SELECT t.path, t.edge_ids, t.distance
FROM trace t
WHERE t.node_id = ?
ORDER BY t.distance
LIMIT 10
"""

TRACE_GET_NODES = """
SELECT id, kind, name, qualified_name, file_path, language, start_line, end_line
FROM nodes
WHERE id IN ({placeholders})
"""

TRACE_GET_EDGES = """
SELECT id, source, target, kind, metadata, line, col, provenance
FROM edges
WHERE id IN ({placeholders})
"""

# ---------------------------------------------------------------------------
# Filtered graph  (with optional exclusions)
# ---------------------------------------------------------------------------

GET_GRAPH_NODES = """
SELECT id, kind, name, qualified_name, file_path, language, start_line, end_line
FROM nodes
WHERE 1=1
  {kind_clause}
  {file_clause}
ORDER BY file_path, start_line
"""

GET_GRAPH_EDGES = """
SELECT e.id, e.source, e.target, e.kind, e.metadata, e.line, e.col, e.provenance
FROM edges e
WHERE 1=1
  {kind_clause}
  {exclude_imports}
  {exclude_contains}
  {node_filter}
ORDER BY e.source, e.target
"""

GET_CONNECTION_COUNTS = """
SELECT node_id, cnt FROM (
    SELECT source AS node_id, COUNT(*) AS cnt FROM edges GROUP BY source
    UNION ALL
    SELECT target AS node_id, COUNT(*) AS cnt FROM edges GROUP BY target
)
GROUP BY node_id
HAVING SUM(cnt) >= ?
"""
