// ---------------------------------------------------------------------------
// Graph rendering styles for Sigma.js
// Reducers control how nodes and edges appear based on interaction state
// (hover, selection, search highlighting, dimming).
// ---------------------------------------------------------------------------

import {
  NODE_COLORS,
  NODE_SIZES,
  EDGE_COLORS,
  EDGE_WIDTHS,
  getNodeColor,
  getEdgeColor,
  getNodeSize,
  getEdgeWidth,
} from '../lib/colors';
import { ambient } from './ambient';

// Re-export graph design tokens so consumers can import from one place.
export {
  NODE_COLORS,
  NODE_SIZES,
  EDGE_COLORS,
  EDGE_WIDTHS,
  getNodeColor,
  getEdgeColor,
  getNodeSize,
  getEdgeWidth,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Scale multiplier applied to a node on hover. */
export const HOVER_SCALE = 1.5;

/** Opacity for nodes/edges that are dimmed (not part of the active context). */
export const DIM_OPACITY = 0.15;

/** Ring color drawn around the selected node. */
export const SELECTED_RING_COLOR = '#6366f1'; // accent/indigo

/** Ring stroke width around the selected node (px). */
export const SELECTED_RING_WIDTH = 3;

/** Default label font size (px). */
export const LABEL_SIZE = 12;

/** Label color per theme. */
export const LABEL_COLOR = {
  dark:  '#e4e4ef',
  light: '#111827',
} as const;

/** Label background per theme (semi-transparent surface for readability). */
export const LABEL_BG_COLOR = {
  dark:  '#12121ae6', // bg-secondary at 90% opacity
  light: '#f8f9fbe6',
} as const;

// ---------------------------------------------------------------------------
// Types for Sigma reducers
// ---------------------------------------------------------------------------

/** The interaction state passed into every reducer call. */
export interface GraphHighlightState {
  /** Key of the currently hovered node, or null. */
  hoveredNode: string | null;
  /** Key of the selected (clicked) node, or null. */
  selectedNode: string | null;
  /** Set of node keys that are neighbors of the hovered / selected node. */
  highlightedNeighbors: Set<string>;
  /** Optional search query — nodes whose label matches are kept bright. */
  searchQuery: string | null;
  /** Focus mode: the multi-hop cluster of the focal node (null = not focusing). */
  focusCluster?: Set<string> | null;
  /** Focus mode: focal node + direct neighbours (these get labels). */
  focusOneHop?: Set<string> | null;
  /** Focus mode: the focal node id. */
  focalNode?: string | null;
}

/** Focus-mode edge colours, by direction relative to the focal node. */
const FOCUS_EDGE_OUT = '#89dceb'; // focal → X  (what it calls)
const FOCUS_EDGE_IN = '#fab387'; // X → focal  (what calls it)
const FOCUS_EDGE_BETWEEN = '#7f84a0'; // neighbour ↔ neighbour
/** Opacity for nodes/edges outside the focused cluster (dim backdrop). */
const FOCUS_DIM_NODE = 0.07;
const FOCUS_DIM_EDGE = 0.04;

/** Sigma node display attributes that a reducer can mutate. */
export interface NodeDisplayData {
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  hidden: boolean;
  /** Custom properties understood by our renderer. */
  highlighted?: boolean;
  forceLabel?: boolean;
  zIndex?: number;
  type?: string;
  borderColor?: string;
  borderSize?: number;
}

/** Sigma edge display attributes that a reducer can mutate. */
export interface EdgeDisplayData {
  size: number;
  color: string;
  label: string;
  hidden: boolean;
  type?: string;
  forceLabel?: boolean;
  zIndex?: number;
}

// ---------------------------------------------------------------------------
// Node attributes stored in the graph data model (from the backend)
// ---------------------------------------------------------------------------

export interface NodeAttributes {
  kind: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  [key: string]: unknown;
}

export interface EdgeAttributes {
  kind: string;
  label?: string;
  size?: number;
  color?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Reducer: nodes
// ---------------------------------------------------------------------------

/**
 * Sigma `nodeReducer` — computes the visual display data for every node on
 * each render tick. Handles hover magnification, selection rings, neighbour
 * highlighting, dimming, and search filtering.
 */
export function nodeReducer(
  state: GraphHighlightState,
  nodeKey: string,
  attrs: NodeAttributes,
): Partial<NodeDisplayData> {
  // Spread ALL input attrs so x, y, label, etc. are always present.
  const out: Partial<NodeDisplayData> = { ...attrs };
  const kind = attrs.kind ?? 'unknown';

  out.color = attrs.color ?? getNodeColor(kind);
  out.size  = attrs.size  ?? getNodeSize(kind);

  // Ambient "breathing": offset each node by a small per-node sinusoid. Purely
  // visual — the underlying graph positions are untouched.
  if (ambient.enabled) {
    const phase = (attrs.phase as number) ?? 0;
    out.x = (attrs.x ?? 0) + Math.sin(ambient.clock + phase) * ambient.amplitude;
    out.y = (attrs.y ?? 0) + Math.cos(ambient.clock * 0.9 + phase) * ambient.amplitude;
  }

  const { hoveredNode, selectedNode, highlightedNeighbors, searchQuery } = state;
  const hasContext = hoveredNode !== null || selectedNode !== null;

  // --- Focus mode takes over: bright cluster, dim backdrop, labels on the
  //     focal node + its direct neighbours only. ---
  if (state.focusCluster) {
    if (!state.focusCluster.has(nodeKey)) {
      out.color = dimColor(out.color ?? '#64748b', FOCUS_DIM_NODE);
      // Shrink the backdrop to faint specks so it doesn't cover the cluster's
      // edges (Sigma always draws edges beneath nodes).
      out.size = Math.min(out.size ?? 2, 1.5);
      out.label = '';
      out.zIndex = 0;
      return out;
    }
    out.zIndex = 1;
    if (state.focalNode === nodeKey) {
      out.size = 14;
      out.forceLabel = true;
      out.highlighted = true;
      out.zIndex = 3;
      out.borderColor = SELECTED_RING_COLOR;
      out.borderSize = SELECTED_RING_WIDTH;
    } else {
      // Keep neighbours small and uniform so they don't overlap into blobs.
      out.size = Math.min(out.size ?? 6, 7);
      // Label the focal node + all its direct (1-hop) neighbours. Deeper nodes
      // (2+ hops) stay unlabelled — hover to reveal — to limit clutter.
      if (state.focusOneHop?.has(nodeKey)) {
        out.forceLabel = true;
        out.zIndex = 2;
      } else {
        out.label = '';
      }
    }
    if (hoveredNode === nodeKey) {
      out.size = (out.size ?? 6) * HOVER_SCALE;
      out.forceLabel = true;
      out.zIndex = 4;
    }
    return out;
  }

  if (hoveredNode === nodeKey) {
    out.size = (out.size ?? 6) * HOVER_SCALE;
    out.highlighted = true;
    out.forceLabel = true;
    out.zIndex = 2;
    return out;
  }

  if (selectedNode === nodeKey) {
    out.highlighted = true;
    out.forceLabel = true;
    out.zIndex = 2;
    out.borderColor = SELECTED_RING_COLOR;
    out.borderSize = SELECTED_RING_WIDTH;
    return out;
  }

  if (hasContext && highlightedNeighbors.has(nodeKey)) {
    out.forceLabel = true;
    out.zIndex = 1;
    return out;
  }

  if (hasContext && !highlightedNeighbors.has(nodeKey)) {
    out.color = dimColor(out.color ?? '#64748b', DIM_OPACITY);
    out.label = '';
    out.zIndex = 0;
    return out;
  }

  if (searchQuery) {
    const matches = attrs.label?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matches) {
      out.color = dimColor(out.color ?? '#64748b', DIM_OPACITY);
      out.label = '';
    } else {
      out.forceLabel = true;
      out.zIndex = 1;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Reducer: edges
// ---------------------------------------------------------------------------

/**
 * Sigma `edgeReducer` — computes the visual display data for every edge on
 * each render tick. Dims edges that are not part of the current hover /
 * selection context.
 */
export function edgeReducer(
  state: GraphHighlightState,
  _edgeKey: string,
  attrs: EdgeAttributes,
  sourceKey: string,
  targetKey: string,
): Partial<EdgeDisplayData> {
  const out: Partial<EdgeDisplayData> = { ...attrs };
  const kind = attrs.kind ?? 'unknown';

  out.color = attrs.color ?? getEdgeColor(kind);
  out.size  = attrs.size  ?? getEdgeWidth(kind);

  // --- Focus mode: colour cluster edges by call direction, hide the rest. ---
  if (state.focusCluster) {
    const inCluster =
      state.focusCluster.has(sourceKey) && state.focusCluster.has(targetKey);
    if (!inCluster) {
      out.color = dimColor(out.color ?? '#334155', FOCUS_DIM_EDGE);
      out.zIndex = 0;
      return out;
    }
    const focal = state.focalNode;
    if (sourceKey === focal) out.color = FOCUS_EDGE_OUT;
    else if (targetKey === focal) out.color = FOCUS_EDGE_IN;
    else out.color = FOCUS_EDGE_BETWEEN;
    const incident = sourceKey === focal || targetKey === focal;
    out.size = incident ? (out.size ?? 1) * 1.8 + 0.6 : (out.size ?? 1);
    out.zIndex = 1;
    return out;
  }

  const { hoveredNode, selectedNode, highlightedNeighbors } = state;
  const hasContext = hoveredNode !== null || selectedNode !== null;

  if (!hasContext) {
    return out;
  }

  // Keep edges that connect to the focal node or are between highlighted
  // neighbours; dim everything else.
  const focalNode = hoveredNode ?? selectedNode;
  const isConnected =
    sourceKey === focalNode ||
    targetKey === focalNode ||
    (highlightedNeighbors.has(sourceKey) && highlightedNeighbors.has(targetKey));

  if (isConnected) {
    out.zIndex = 1;
  } else {
    out.color = dimColor(out.color ?? '#334155', DIM_OPACITY);
    out.hidden = false; // keep visible but very faint
    out.zIndex = 0;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Produce a dimmed version of a hex color by blending it toward the dark graph
 * background. `keep` is the fraction of the original colour retained (0 = fully
 * background, 1 = unchanged). We blend to a SOLID rgb rather than using an
 * alpha channel because Sigma's WebGL node/edge programs ignore colour alpha.
 */
function dimColor(hex: string, keep: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Graph background ≈ #08080d.
  const mix = (c: number, bg: number) => Math.round(bg + (c - bg) * keep);
  return `rgb(${mix(r, 8)}, ${mix(g, 8)}, ${mix(b, 13)})`;
}
