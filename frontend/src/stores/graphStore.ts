// ---------------------------------------------------------------------------
// Graph interaction state — selection, hover, search, filters, view mode
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { GraphFilter } from '../api/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = 'all' | 'calls' | 'inheritance' | 'structure';

interface GraphState {
  /** Key of the currently selected (clicked) node, or null. */
  selectedNodeId: string | null;
  /** Key of the currently hovered node, or null. */
  hoveredNodeId: string | null;
  /** Current search query string. */
  searchQuery: string;
  /** Active graph filters. */
  filters: GraphFilter;
  /** Which subset of edge kinds to display. */
  viewMode: ViewMode;

  // Actions
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<GraphFilter>) => void;
  setViewMode: (mode: ViewMode) => void;
  clearSelection: () => void;
}

// ---------------------------------------------------------------------------
// Default filter values
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: GraphFilter = {
  exclude_imports: true,
  exclude_contains: true,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGraphStore = create<GraphState>((set) => ({
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  filters: { ...DEFAULT_FILTERS },
  viewMode: 'all',

  selectNode: (id) => set({ selectedNodeId: id }),

  hoverNode: (id) => set({ hoveredNodeId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  setViewMode: (mode) => {
    const edgeFilters: Partial<GraphFilter> = {};
    switch (mode) {
      case 'calls':
        edgeFilters.edge_kinds = ['calls', 'instantiates'];
        edgeFilters.exclude_imports = true;
        edgeFilters.exclude_contains = true;
        break;
      case 'inheritance':
        edgeFilters.edge_kinds = ['extends'];
        edgeFilters.exclude_imports = true;
        edgeFilters.exclude_contains = true;
        break;
      case 'structure':
        edgeFilters.edge_kinds = ['contains'];
        edgeFilters.exclude_imports = true;
        edgeFilters.exclude_contains = false;
        break;
      default:
        edgeFilters.edge_kinds = undefined;
        edgeFilters.exclude_imports = true;
        edgeFilters.exclude_contains = true;
        break;
    }
    set((state) => ({
      viewMode: mode,
      filters: { ...state.filters, ...edgeFilters },
    }));
  },

  clearSelection: () =>
    set({
      selectedNodeId: null,
      hoveredNodeId: null,
    }),
}));
