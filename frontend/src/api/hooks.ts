// ---------------------------------------------------------------------------
// React Query hooks — typed wrappers around the API client
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getFiles,
  getFileTree,
  getGraph,
  getGraphStats,
  getImpact,
  getNode,
  getNodeCallers,
  getNodeCallees,
  getTrace,
  searchNodes,
} from './client';
import type { GraphFilter } from './types';

// ---------------------------------------------------------------------------
// Stable key serialisation for filters
// ---------------------------------------------------------------------------

function filterKey(filter?: GraphFilter): unknown {
  if (!filter) return null;
  // Sort keys so the query key is deterministic regardless of property order.
  return JSON.parse(JSON.stringify(filter));
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch the full graph, optionally filtered. */
export function useGraph(filter?: GraphFilter) {
  const stableFilter = useMemo(() => filterKey(filter), [filter]);
  return useQuery({
    queryKey: ['graph', stableFilter],
    queryFn: () => getGraph(filter),
  });
}

/** Fetch aggregate graph statistics. */
export function useGraphStats() {
  return useQuery({
    queryKey: ['graph', 'stats'],
    queryFn: getGraphStats,
  });
}

/** Fetch the full detail for a single node (enabled only when id is non-null). */
export function useNode(id: string | null) {
  return useQuery({
    queryKey: ['node', id],
    queryFn: () => getNode(id!),
    enabled: id !== null,
  });
}

/** Fetch callers (incoming edges) for a node. */
export function useNodeCallers(id: string | null) {
  return useQuery({
    queryKey: ['node', id, 'callers'],
    queryFn: () => getNodeCallers(id!),
    enabled: id !== null,
  });
}

/** Fetch callees (outgoing edges) for a node. */
export function useNodeCallees(id: string | null) {
  return useQuery({
    queryKey: ['node', id, 'callees'],
    queryFn: () => getNodeCallees(id!),
    enabled: id !== null,
  });
}

/** Search nodes by query string (enabled when query is at least 2 characters). */
export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => searchNodes(trimmed),
    enabled: trimmed.length >= 2,
    placeholderData: (prev) => prev,
  });
}

/** Compute the impact analysis for a node. */
export function useImpact(id: string | null, depth?: number) {
  return useQuery({
    queryKey: ['impact', id, depth],
    queryFn: () => getImpact(id!, depth),
    enabled: id !== null,
  });
}

/** Find trace paths between two nodes. */
export function useTrace(fromId: string | null, toId: string | null) {
  return useQuery({
    queryKey: ['trace', fromId, toId],
    queryFn: () => getTrace(fromId!, toId!),
    enabled: fromId !== null && toId !== null,
  });
}

/** List all indexed files. */
export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: getFiles,
  });
}

/** Get the file tree hierarchy. */
export function useFileTree() {
  return useQuery({
    queryKey: ['files', 'tree'],
    queryFn: getFileTree,
  });
}
