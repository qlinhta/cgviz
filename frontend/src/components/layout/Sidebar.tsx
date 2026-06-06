// ---------------------------------------------------------------------------
// Sidebar — collapsible panel with Search / Filter / Detail tabs
// ---------------------------------------------------------------------------

import { useUiStore } from '../../stores/uiStore';
import type { SidebarTab } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { SearchPanel } from '../panels/SearchPanel';
import { FilterPanel } from '../panels/FilterPanel';
import { NodeDetailPanel } from '../panels/NodeDetailPanel';

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

interface TabDef {
  id: SidebarTab;
  label: string;
  /** Inline SVG icon (viewBox 0 0 24 24) */
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'filter',
    label: 'Filter',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    id: 'detail',
    label: 'Detail',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Panel map
// ---------------------------------------------------------------------------

const PANEL_MAP: Record<SidebarTab, React.ReactNode> = {
  search: <SearchPanel />,
  filter: <FilterPanel />,
  detail: <NodeDetailPanel />,
  impact: <NodeDetailPanel />, // Impact reuses detail for now
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const { sidebarOpen, sidebarTab, toggleSidebar, setSidebarTab } = useUiStore();

  return (
    <div className="relative flex shrink-0 z-panel">
      {/* Sidebar panel */}
      <div
        className={cn(
          'flex flex-col border-r bg-bg-secondary overflow-hidden transition-all duration-200 ease-in-out',
          sidebarOpen ? 'w-[280px]' : 'w-0',
        )}
      >
        {/* Tab bar */}
        <div className="flex shrink-0 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 h-10 text-2xs font-medium transition-colors border-b-2',
                sidebarTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary',
              )}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Active panel content */}
        <div className="flex-1 overflow-hidden">
          {PANEL_MAP[sidebarTab]}
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 flex h-6 w-4 items-center justify-center rounded-r-sm bg-bg-secondary border border-l-0 text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors z-10',
          sidebarOpen ? 'left-[280px]' : 'left-0',
        )}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            sidebarOpen ? '' : 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}
