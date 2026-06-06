// ---------------------------------------------------------------------------
// API client — typed fetch wrappers for every backend endpoint
// ---------------------------------------------------------------------------

import type {
  EdgeData,
  FileInfo,
  FileTreeNode,
  GraphData,
  GraphFilter,
  GraphStats,
  ImpactResult,
  NodeDetail,
  SearchResult,
  TracePath,
} from './types';

/** Base URL for API requests. Empty string = same-origin (works with Vite proxy and prod). */
const BASE_URL = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a query string from a params object, filtering out null/undefined values.
 * Returns the leading '?' or an empty string if no params remain.
 */
function buildQueryString(params: Record<string, string | number | boolean | string[] | undefined | null>): string {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        entries.push([key, item]);
      }
    } else {
      entries.push([key, String(value)]);
    }
  }

  if (entries.length === 0) return '';

  const qs = new URLSearchParams(entries);
  return `?${qs.toString()}`;
}

/**
 * Perform a fetch request and return the parsed JSON body.
 * Throws on non-2xx responses with the status text.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${response.statusText}${body ? ` — ${body}` : ''}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** Fetch the full graph with optional filters. */
export async function getGraph(filter?: GraphFilter): Promise<GraphData> {
  // The /api/graph endpoint expects these list filters as COMMA-SEPARATED
  // strings (it does `value.split(",")`), so join arrays here rather than
  // emitting repeated query params (which FastAPI would collapse to the last
  // value — silently dropping all but one edge/node kind).
  const join = (v?: string[]) => (v && v.length ? v.join(',') : undefined);
  const qs = filter
    ? buildQueryString({
        node_kinds: join(filter.node_kinds),
        edge_kinds: join(filter.edge_kinds),
        file_paths: join(filter.file_paths),
        exclude_imports: filter.exclude_imports,
        exclude_contains: filter.exclude_contains,
        min_connections: filter.min_connections,
      })
    : '';

  return fetchJson<GraphData>(`/api/graph${qs}`);
}

/** Fetch aggregate graph statistics. */
export async function getGraphStats(): Promise<GraphStats> {
  return fetchJson<GraphStats>('/api/graph/stats');
}

/** Fetch full detail for a single node. */
export async function getNode(id: string): Promise<NodeDetail> {
  return fetchJson<NodeDetail>(`/api/nodes/${encodeURIComponent(id)}`);
}

/** Fetch all edges where the given node is the target (callers). */
export async function getNodeCallers(id: string): Promise<EdgeData[]> {
  return fetchJson<EdgeData[]>(`/api/nodes/${encodeURIComponent(id)}/callers`);
}

/** Fetch all edges where the given node is the source (callees). */
export async function getNodeCallees(id: string): Promise<EdgeData[]> {
  return fetchJson<EdgeData[]>(`/api/nodes/${encodeURIComponent(id)}/callees`);
}

/** Search nodes by name or qualified name. */
export async function searchNodes(q: string, limit?: number): Promise<SearchResult[]> {
  const qs = buildQueryString({ q, limit });
  return fetchJson<SearchResult[]>(`/api/search${qs}`);
}

/** Compute the impact of changing a specific node. */
export async function getImpact(id: string, depth?: number): Promise<ImpactResult> {
  const qs = buildQueryString({ depth });
  return fetchJson<ImpactResult>(`/api/impact/${encodeURIComponent(id)}${qs}`);
}

/** Find all paths between two nodes. */
export async function getTrace(fromId: string, toId: string): Promise<TracePath[]> {
  const qs = buildQueryString({ from_id: fromId, to_id: toId });
  return fetchJson<TracePath[]>(`/api/trace${qs}`);
}

/** List all indexed files with metadata. */
export async function getFiles(): Promise<FileInfo[]> {
  return fetchJson<FileInfo[]>('/api/files');
}

/** Get the hierarchical file tree. */
export async function getFileTree(): Promise<FileTreeNode> {
  return fetchJson<FileTreeNode>('/api/files/tree');
}
