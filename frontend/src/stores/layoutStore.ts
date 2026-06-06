// ---------------------------------------------------------------------------
// Layout algorithm state — which algorithm is active and whether it's running
// ---------------------------------------------------------------------------

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayoutAlgorithm = 'force' | 'hierarchical' | 'radial' | 'tree';
export type GraphDimension = '2d' | '3d';

interface LayoutState {
  /** The currently active layout algorithm. */
  algorithm: LayoutAlgorithm;
  /** Whether a layout computation is currently running. */
  isRunning: boolean;
  /** Whether subtle ambient "breathing" motion is enabled. */
  ambient: boolean;
  /** 2D (Sigma) or 3D (Three.js) rendering. */
  dimension: GraphDimension;
  /** How many hops the focus cluster reaches (1–4). */
  focusDepth: number;

  // Actions
  setAlgorithm: (algorithm: LayoutAlgorithm) => void;
  setRunning: (running: boolean) => void;
  toggleAmbient: () => void;
  setDimension: (dimension: GraphDimension) => void;
  setFocusDepth: (depth: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLayoutStore = create<LayoutState>((set) => ({
  algorithm: 'force',
  isRunning: false,
  ambient: true,
  dimension: '2d',
  focusDepth: 2,

  setAlgorithm: (algorithm) => set({ algorithm }),

  setRunning: (isRunning) => set({ isRunning }),

  toggleAmbient: () => set((s) => ({ ambient: !s.ambient })),

  setDimension: (dimension) => set({ dimension }),

  setFocusDepth: (depth) => set({ focusDepth: Math.max(1, Math.min(4, depth)) }),
}));
