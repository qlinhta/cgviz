// ---------------------------------------------------------------------------
// SearchPanel — symbol search input + results list
// ---------------------------------------------------------------------------

import { useGraphStore } from '../../stores/graphStore';
import { useUiStore } from '../../stores/uiStore';
import { useSearch } from '../../api/hooks';
import { getNodeColor, getNodeLabel } from '../../lib/colors';
import { truncate } from '../../lib/utils';

export function SearchPanel() {
  const { searchQuery, setSearchQuery, selectNode } = useGraphStore();
  const { setSidebarTab } = useUiStore();
  const { data: results, isLoading, isFetching } = useSearch(searchQuery);

  const trimmedQuery = searchQuery.trim();
  const showEmpty = trimmedQuery.length < 2 && !results;
  const showResults = !showEmpty && results && results.length > 0;
  const showNoResults = !showEmpty && !isLoading && trimmedQuery.length >= 2 && results && results.length === 0;

  function handleSelect(nodeId: string) {
    selectNode(nodeId);
    setSidebarTab('detail');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols..."
            className="w-full h-8 rounded-md border bg-bg-tertiary pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              title="Clear search"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <svg className="h-8 w-8 text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-xs text-text-muted">Type to search symbols</p>
            <p className="text-2xs text-text-muted mt-1">
              Press <kbd className="kbd">/</kbd> to focus
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && trimmedQuery.length >= 2 && (
          <div className="p-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-md animate-pulse">
                <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-bg-tertiary" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 rounded bg-bg-tertiary" />
                  <div className="h-3 w-40 rounded bg-bg-tertiary" />
                  <div className="h-2.5 w-32 rounded bg-bg-tertiary" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results list */}
        {showResults && (
          <div className="p-2 space-y-0.5">
            {isFetching && (
              <div className="px-2 pb-1">
                <div className="h-0.5 w-full rounded-full bg-bg-tertiary overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-accent animate-pulse" />
                </div>
              </div>
            )}
            {results.map((result) => (
              <button
                key={result.node.id}
                onClick={() => handleSelect(result.node.id)}
                className="flex items-start gap-2.5 w-full text-left p-2 rounded-md hover:bg-bg-tertiary transition-colors group"
              >
                {/* Color dot */}
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getNodeColor(result.node.kind) }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary group-hover:text-accent truncate">
                      {result.node.name}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-medium"
                      style={{
                        backgroundColor: getNodeColor(result.node.kind) + '18',
                        color: getNodeColor(result.node.kind),
                      }}
                    >
                      {getNodeLabel(result.node.kind)}
                    </span>
                  </div>
                  <p className="text-2xs text-text-muted truncate mt-0.5">
                    {truncate(result.node.qualified_name, 50)}
                  </p>
                  <p className="text-2xs text-text-muted truncate mt-0.5">
                    {result.node.file_path}:{result.node.start_line}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <p className="text-xs text-text-muted">No symbols found</p>
            <p className="text-2xs text-text-muted mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
