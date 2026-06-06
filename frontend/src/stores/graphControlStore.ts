// ---------------------------------------------------------------------------
// Holds references to live graph internals so chrome rendered OUTSIDE the
// SigmaContainer (Toolbar zoom controls) and cross-cutting hooks (drag) can
// reach the renderer and the running force simulation.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type Sigma from 'sigma';
import type FA2Layout from 'graphology-layout-forceatlas2/worker';

interface GraphControlState {
  /** The active Sigma renderer, or null before the canvas mounts. */
  sigma: Sigma | null;
  setSigma: (sigma: Sigma | null) => void;

  /** The live ForceAtlas2 web-worker supervisor for the current graph. */
  forceSupervisor: FA2Layout | null;
  setForceSupervisor: (s: FA2Layout | null) => void;
}

export const useGraphControlStore = create<GraphControlState>((set) => ({
  sigma: null,
  setSigma: (sigma) => set({ sigma }),

  forceSupervisor: null,
  setForceSupervisor: (forceSupervisor) => set({ forceSupervisor }),
}));
