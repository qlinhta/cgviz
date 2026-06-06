// ---------------------------------------------------------------------------
// UI chrome state — sidebar, tabs, theme
// ---------------------------------------------------------------------------

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SidebarTab = 'search' | 'filter' | 'detail' | 'impact';
export type Theme = 'dark' | 'light';

interface UiState {
  /** Whether the sidebar panel is open. */
  sidebarOpen: boolean;
  /** Which tab is active in the sidebar. */
  sidebarTab: SidebarTab;
  /** Current color theme. */
  theme: Theme;

  // Actions
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the initial theme from the document or default to dark. */
function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'light') return 'light';
  }
  return 'dark';
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  sidebarTab: 'search',
  theme: getInitialTheme(),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarTab: (tab) => set({ sidebarTab: tab, sidebarOpen: true }),

  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
}));
