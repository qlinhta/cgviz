// ---------------------------------------------------------------------------
// StatusBar — bottom bar with graph stats, layout info, and connection status
// ---------------------------------------------------------------------------

import { useGraphStats } from '../../api/hooks';
import { useLayoutStore } from '../../stores/layoutStore';
import { LAYOUT_OPTIONS } from '../../lib/constants';
import { formatNumber } from '../../lib/utils';

export function StatusBar() {
  const { data: stats } = useGraphStats();
  const { algorithm, isRunning } = useLayoutStore();

  const layoutLabel =
    LAYOUT_OPTIONS.find((o) => o.value === algorithm)?.label ?? algorithm;

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-bg-secondary px-3 text-2xs text-text-muted z-toolbar">
      {/* ---- Left: graph stats ---- */}
      <div className="flex items-center gap-3">
        {stats ? (
          <>
            <span>
              {formatNumber(stats.total_nodes)} nodes
            </span>
            <span className="text-border">|</span>
            <span>
              {formatNumber(stats.total_edges)} edges
            </span>
            <span className="text-border">|</span>
            <span>
              {layoutLabel}
              {isRunning && (
                <span className="ml-1 inline-block animate-spin-slow">
                  <svg className="inline h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M4 12a8 8 0 018-8" />
                  </svg>
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="animate-pulse">Loading...</span>
        )}
      </div>

      {/* ---- Right: connection status ---- */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-text-muted">Connected</span>
      </div>
    </footer>
  );
}
