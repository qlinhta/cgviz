// ---------------------------------------------------------------------------
// Application constants — layout options, view modes, keyboard shortcuts
// ---------------------------------------------------------------------------

import type { LayoutAlgorithm } from '../stores/layoutStore';
import type { ViewMode } from '../stores/graphStore';

// ---------------------------------------------------------------------------
// Layout algorithms
// ---------------------------------------------------------------------------

export interface LayoutOption {
  value: LayoutAlgorithm;
  label: string;
  icon: string;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  { value: 'force', label: 'Force-Directed', icon: 'Orbit' },
  { value: 'hierarchical', label: 'Hierarchical', icon: 'GitBranch' },
  { value: 'radial', label: 'Radial', icon: 'CircleDot' },
  { value: 'tree', label: 'Tree', icon: 'Network' },
];

// ---------------------------------------------------------------------------
// View modes
// ---------------------------------------------------------------------------

export interface ViewModeOption {
  value: ViewMode;
  label: string;
  description: string;
}

export const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  { value: 'all', label: 'All Edges', description: 'Show all relationship types' },
  { value: 'calls', label: 'Call Graph', description: 'Function and method calls only' },
  { value: 'inheritance', label: 'Inheritance', description: 'Extends and implements relationships' },
  { value: 'structure', label: 'Structure', description: 'Containment hierarchy (files, classes, methods)' },
];

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '/', description: 'Focus search', action: 'focusSearch' },
  { key: 'Escape', description: 'Clear selection', action: 'clearSelection' },
  { key: 'b', description: 'Toggle sidebar', action: 'toggleSidebar' },
  { key: 't', description: 'Toggle theme', action: 'toggleTheme' },
  { key: '1', description: 'Switch to Force layout', action: 'layoutForce' },
  { key: '2', description: 'Switch to Hierarchical layout', action: 'layoutHierarchical' },
  { key: '3', description: 'Switch to Radial layout', action: 'layoutRadial' },
  { key: '4', description: 'Switch to Tree layout', action: 'layoutTree' },
  { key: 'i', description: 'Show impact analysis', action: 'showImpact' },
  { key: '?', description: 'Show keyboard shortcuts', action: 'showHelp' },
];
