// ---------------------------------------------------------------------------
// FilterPanel — node kind and edge kind checkboxes to control graph filters
// ---------------------------------------------------------------------------

import { useGraphStore } from '../../stores/graphStore';
import { useGraphStats } from '../../api/hooks';
import { getNodeColor, getNodeLabel, getEdgeColor, getEdgeLabel } from '../../lib/colors';
import { formatNumber } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_KINDS = ['file', 'class', 'function', 'method', 'variable', 'import', 'enum'] as const;
const EDGE_KINDS = ['contains', 'calls', 'imports', 'instantiates', 'extends'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilterPanel() {
  const { filters, setFilters } = useGraphStore();
  const { data: stats } = useGraphStats();

  // Derive which node/edge kinds are currently excluded.
  // The GraphFilter model uses exclude_imports and exclude_contains as
  // booleans, plus optional node_kinds / edge_kinds arrays for inclusion.
  // For the UI, we track exclusions per-kind more granularly.
  const excludedNodeKinds = new Set(
    NODE_KINDS.filter((kind) => {
      if (kind === 'import') return filters.exclude_imports;
      if (filters.node_kinds && filters.node_kinds.length > 0) {
        return !filters.node_kinds.includes(kind);
      }
      return false;
    }),
  );

  const excludedEdgeKinds = new Set(
    EDGE_KINDS.filter((kind) => {
      if (kind === 'contains') return filters.exclude_contains;
      if (kind === 'imports') return filters.exclude_imports;
      if (filters.edge_kinds && filters.edge_kinds.length > 0) {
        return !filters.edge_kinds.includes(kind);
      }
      return false;
    }),
  );

  function toggleNodeKind(kind: string) {
    if (kind === 'import') {
      setFilters({ exclude_imports: !filters.exclude_imports });
      return;
    }

    const currentIncluded = filters.node_kinds ?? NODE_KINDS.filter((k) => k !== 'import' || !filters.exclude_imports);
    if (currentIncluded.includes(kind)) {
      const next = currentIncluded.filter((k) => k !== kind);
      setFilters({ node_kinds: next.length > 0 ? next : undefined });
    } else {
      setFilters({ node_kinds: [...currentIncluded, kind] });
    }
  }

  function toggleEdgeKind(kind: string) {
    if (kind === 'contains') {
      setFilters({ exclude_contains: !filters.exclude_contains });
      return;
    }
    if (kind === 'imports') {
      setFilters({ exclude_imports: !filters.exclude_imports });
      return;
    }

    const currentIncluded = filters.edge_kinds ?? EDGE_KINDS.filter((k) => {
      if (k === 'contains') return !filters.exclude_contains;
      if (k === 'imports') return !filters.exclude_imports;
      return true;
    });
    if (currentIncluded.includes(kind)) {
      const next = currentIncluded.filter((k) => k !== kind);
      setFilters({ edge_kinds: next.length > 0 ? next : undefined });
    } else {
      setFilters({ edge_kinds: [...currentIncluded, kind] });
    }
  }

  function resetFilters() {
    setFilters({
      exclude_imports: true,
      exclude_contains: true,
      node_kinds: undefined,
      edge_kinds: undefined,
      file_paths: undefined,
      min_connections: undefined,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Node Kinds */}
      <div className="p-3 border-b">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Node Kinds
        </h3>
        <div className="space-y-1">
          {NODE_KINDS.map((kind) => {
            const isExcluded = excludedNodeKinds.has(kind);
            const count = stats?.nodes_by_kind[kind] ?? 0;
            return (
              <label
                key={kind}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-tertiary cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={!isExcluded}
                  onChange={() => toggleNodeKind(kind)}
                  className="sr-only"
                />
                {/* Custom checkbox */}
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                  style={{
                    borderColor: isExcluded ? 'var(--color-border)' : getNodeColor(kind),
                    backgroundColor: isExcluded ? 'transparent' : getNodeColor(kind) + '20',
                  }}
                >
                  {!isExcluded && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke={getNodeColor(kind)} strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {/* Color dot */}
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getNodeColor(kind), opacity: isExcluded ? 0.3 : 1 }}
                />
                {/* Label */}
                <span className={`flex-1 text-xs ${isExcluded ? 'text-text-muted' : 'text-text-primary'}`}>
                  {getNodeLabel(kind)}
                </span>
                {/* Count */}
                <span className="text-2xs text-text-muted tabular-nums">
                  {formatNumber(count)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Edge Kinds */}
      <div className="p-3 border-b">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Edge Kinds
        </h3>
        <div className="space-y-1">
          {EDGE_KINDS.map((kind) => {
            const isExcluded = excludedEdgeKinds.has(kind);
            return (
              <label
                key={kind}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-tertiary cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={!isExcluded}
                  onChange={() => toggleEdgeKind(kind)}
                  className="sr-only"
                />
                {/* Custom checkbox */}
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                  style={{
                    borderColor: isExcluded ? 'var(--color-border)' : getEdgeColor(kind),
                    backgroundColor: isExcluded ? 'transparent' : getEdgeColor(kind) + '20',
                  }}
                >
                  {!isExcluded && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke={getEdgeColor(kind)} strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {/* Color dot */}
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getEdgeColor(kind), opacity: isExcluded ? 0.3 : 1 }}
                />
                {/* Label */}
                <span className={`flex-1 text-xs ${isExcluded ? 'text-text-muted' : 'text-text-primary'}`}>
                  {getEdgeLabel(kind)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3">
        <button
          onClick={resetFilters}
          className="w-full h-8 rounded-md border text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}
