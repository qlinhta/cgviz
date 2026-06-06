// ---------------------------------------------------------------------------
// Toolbar — top bar with layout selector, view mode toggle, zoom, and theme
// ---------------------------------------------------------------------------

import { useLayoutStore } from '../../stores/layoutStore';
import { useGraphStore } from '../../stores/graphStore';
import { useUiStore } from '../../stores/uiStore';
import { useGraphControlStore } from '../../stores/graphControlStore';
import { LAYOUT_OPTIONS, VIEW_MODE_OPTIONS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import type { LayoutAlgorithm } from '../../stores/layoutStore';
import type { ViewMode } from '../../stores/graphStore';

export function Toolbar() {
  const { algorithm, setAlgorithm, ambient, toggleAmbient, dimension, setDimension } =
    useLayoutStore();
  const { viewMode, setViewMode } = useGraphStore();
  const { theme, toggleTheme } = useUiStore();
  const sigma = useGraphControlStore((s) => s.sigma);
  const is3D = dimension === '3d';

  const zoomIn = () => sigma?.getCamera().animatedZoom({ duration: 250 });
  const zoomOut = () => sigma?.getCamera().animatedUnzoom({ duration: 250 });
  const fitToScreen = () => sigma?.getCamera().animatedReset({ duration: 400 });

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-bg-secondary/80 backdrop-blur px-3 z-toolbar">
      {/* ---- Left side ---- */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-accent"
            viewBox="0 0 32 32"
            fill="none"
          >
            <circle cx="16" cy="16" r="4" fill="currentColor" />
            <circle cx="6" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="26" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="8" cy="26" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="24" cy="24" r="2.5" fill="currentColor" opacity="0.8" />
            <line x1="14" y1="13" x2="7.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <line x1="18" y1="13" x2="24.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <line x1="14" y1="19" x2="9.5" y2="24.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
            <line x1="18" y1="19" x2="22.5" y2="22.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            CodeGraph
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Layout selector (2D only) */}
        <div className="flex items-center gap-1.5">
          <label className="text-2xs text-text-muted" htmlFor="layout-select">
            Layout
          </label>
          <select
            id="layout-select"
            value={algorithm}
            disabled={is3D}
            onChange={(e) => setAlgorithm(e.target.value as LayoutAlgorithm)}
            className="h-7 rounded-md border bg-bg-tertiary px-2 text-xs text-text-primary outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {LAYOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* 2D / 3D dimension toggle */}
        <div className="flex items-center rounded-md border bg-bg-tertiary p-0.5">
          {(['2d', '3d'] as const).map((dim) => (
            <button
              key={dim}
              onClick={() => setDimension(dim)}
              title={dim === '3d' ? 'Immersive 3D view' : 'Standard 2D view'}
              className={cn(
                'rounded px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide transition-colors',
                dimension === dim
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {dim}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border bg-bg-tertiary p-0.5">
          {VIEW_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value as ViewMode)}
              title={opt.description}
              className={cn(
                'rounded px-2.5 py-1 text-2xs font-medium transition-colors',
                viewMode === opt.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Right side ---- */}
      <div className="flex items-center gap-1">
        {/* Zoom controls (2D only) */}
        <div
          className={cn(
            'flex items-center rounded-md border bg-bg-tertiary p-0.5',
            is3D && 'opacity-40 pointer-events-none',
          )}
        >
          <button
            onClick={zoomOut}
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            title="Zoom out"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={zoomIn}
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            title="Zoom in"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={fitToScreen}
            className="flex h-6 px-1.5 items-center justify-center rounded text-2xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            title="Fit to screen"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
            </svg>
          </button>
        </div>

        {/* Ambient motion toggle */}
        <button
          onClick={toggleAmbient}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-tertiary',
            ambient ? 'text-accent' : 'text-text-muted',
          )}
          title={ambient ? 'Ambient motion: on' : 'Ambient motion: off'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c3-4 6-4 9 0s6 4 9 0" />
          </svg>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
