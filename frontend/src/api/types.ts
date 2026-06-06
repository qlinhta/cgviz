// ---------------------------------------------------------------------------
// TypeScript interfaces mirroring the backend Pydantic models
// ---------------------------------------------------------------------------

/** Summary representation of a graph node (used in lists and graph data). */
export interface NodeSummary {
  id: string;
  kind: string;
  name: string;
  qualified_name: string;
  file_path: string;
  language: string;
  start_line: number;
  end_line: number;
}

/** Full detail of a single node, including AST metadata. */
export interface NodeDetail extends NodeSummary {
  start_column: number;
  end_column: number;
  docstring?: string;
  signature?: string;
  visibility?: string;
  is_exported: boolean;
  is_async: boolean;
  is_static: boolean;
  is_abstract: boolean;
  decorators: string[];
  type_parameters: string[];
}

/** A directed edge between two nodes. */
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  kind: string;
  metadata?: Record<string, unknown>;
  line?: number;
  col?: number;
  provenance?: string;
  source_name?: string;
  target_name?: string;
}

/** Full graph payload returned by GET /api/graph. */
export interface GraphData {
  nodes: NodeSummary[];
  edges: EdgeData[];
  stats: GraphStats;
}

/** Aggregate statistics about the graph. */
export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  nodes_by_kind: Record<string, number>;
  edges_by_kind: Record<string, number>;
  languages: string[];
  files_count: number;
}

/** Filter parameters for the graph query. */
export interface GraphFilter {
  node_kinds?: string[];
  edge_kinds?: string[];
  file_paths?: string[];
  exclude_imports?: boolean;
  exclude_contains?: boolean;
  min_connections?: number;
}

/** A search result with ranking and optional snippet. */
export interface SearchResult {
  node: NodeSummary;
  rank: number;
  snippet?: string;
}

/** A node in the impact analysis result. */
export interface ImpactNode {
  node: NodeSummary;
  distance: number;
  path: string[];
  edge_kind: string;
}

/** Result of an impact analysis rooted at a specific node. */
export interface ImpactResult {
  root: NodeSummary;
  affected: ImpactNode[];
  depth: number;
}

/** A single path through the graph from source to target. */
export interface TracePath {
  nodes: NodeSummary[];
  edges: EdgeData[];
}

/** Metadata about a source file in the indexed project. */
export interface FileInfo {
  path: string;
  language: string;
  size: number;
  node_count: number;
  modified_at: string;
}

/** A node in the file tree hierarchy. */
export interface FileTreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileTreeNode[];
  node_count: number;
}

// ---------------------------------------------------------------------------
// WebSocket message types
// ---------------------------------------------------------------------------

export interface WsConnectedMessage {
  type: 'connected';
}

export interface WsGraphUpdatedMessage {
  type: 'graph:updated';
}

export type WsMessage = WsConnectedMessage | WsGraphUpdatedMessage;
