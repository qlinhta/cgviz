// ---------------------------------------------------------------------------
// useGraphEvents — wire Sigma interaction events to Zustand stores
// ---------------------------------------------------------------------------
//
// Listens for enterNode / leaveNode / clickNode / clickStage on the Sigma
// renderer and updates graphStore + uiStore accordingly.  Also computes the
// set of highlighted (neighbour) nodes for use in the style reducers.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import type Sigma from 'sigma';
import type Graph from 'graphology';

import { useGraphStore } from '../stores/graphStore';
import { useUiStore } from '../stores/uiStore';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseGraphEventsResult {
  /** Set of node keys that are neighbours of the currently hovered or selected node. */
  highlightedNeighbors: Set<string>;
}

/**
 * Attach Sigma DOM-level events and keep Zustand in sync.
 *
 * - `enterNode`: mark hovered, compute 1-hop neighbour set.
 * - `leaveNode`: clear hover.
 * - `clickNode`: select node, open sidebar detail tab.
 * - `clickStage`: clear selection.
 *
 * All listeners are cleaned up when the component unmounts or when the
 * `sigma` reference changes.
 */
export function useGraphEvents(
  sigma: Sigma | null,
  graph: Graph,
): UseGraphEventsResult {
  const [highlightedNeighbors, setHighlightedNeighbors] = useState<Set<string>>(
    new Set(),
  );

  // Store actions — grab stable references so they don't appear in deps.
  const selectNode = useGraphStore((s) => s.selectNode);
  const hoverNode = useGraphStore((s) => s.hoverNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);

  // Keep a ref to the latest selected node to compute neighbours on click.
  const selectedNodeRef = useRef<string | null>(null);

  // Subscribe to selectedNodeId changes outside the event handlers so we
  // always have the latest value.
  useEffect(() => {
    const unsub = useGraphStore.subscribe((state) => {
      selectedNodeRef.current = state.selectedNodeId;
    });
    return unsub;
  }, []);

  // ------------------------------------------------------------------
  // Neighbour computation helper
  // ------------------------------------------------------------------
  const computeNeighbors = useCallback(
    (nodeKey: string): Set<string> => {
      const neighbors = new Set<string>();
      if (!graph.hasNode(nodeKey)) return neighbors;

      graph.forEachNeighbor(nodeKey, (neighbor) => {
        neighbors.add(neighbor);
      });
      // Include the focal node itself so reducers can treat it as "in context".
      neighbors.add(nodeKey);
      return neighbors;
    },
    [graph],
  );

  // ------------------------------------------------------------------
  // Event binding
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!sigma) return;

    // --- enterNode ---
    const handleEnterNode = ({ node }: { node: string }) => {
      hoverNode(node);
      setHighlightedNeighbors(computeNeighbors(node));
    };

    // --- leaveNode ---
    const handleLeaveNode = () => {
      hoverNode(null);

      // If there's a selected node, keep its neighbours highlighted.
      const sel = selectedNodeRef.current;
      if (sel) {
        setHighlightedNeighbors(computeNeighbors(sel));
      } else {
        setHighlightedNeighbors(new Set());
      }
    };

    // --- clickNode ---
    const handleClickNode = ({ node }: { node: string }) => {
      selectNode(node);
      setSidebarTab('detail');
      setHighlightedNeighbors(computeNeighbors(node));
    };

    // --- clickStage ---
    const handleClickStage = () => {
      clearSelection();
      setHighlightedNeighbors(new Set());
    };

    sigma.on('enterNode', handleEnterNode);
    sigma.on('leaveNode', handleLeaveNode);
    sigma.on('clickNode', handleClickNode);
    sigma.on('clickStage', handleClickStage);

    return () => {
      sigma.off('enterNode', handleEnterNode);
      sigma.off('leaveNode', handleLeaveNode);
      sigma.off('clickNode', handleClickNode);
      sigma.off('clickStage', handleClickStage);
    };
  }, [
    sigma,
    hoverNode,
    selectNode,
    clearSelection,
    setSidebarTab,
    computeNeighbors,
  ]);

  return { highlightedNeighbors };
}
