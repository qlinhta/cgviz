// ---------------------------------------------------------------------------
// Design tokens for graph visualization — node and edge colors, sizes, labels
// ---------------------------------------------------------------------------

/**
 * Hex color for each node kind.
 *
 * Palette derived from Catppuccin Mocha — soft, desaturated jewel tones that
 * read as modern and "glow" gently on the near-black graph canvas instead of
 * the harsh primary colors of a default Tailwind palette.
 */
export const NODE_COLORS: Record<string, string> = {
  file:        '#89b4fa', // blue
  class:       '#fab387', // peach
  function:    '#a6e3a1', // green
  method:      '#89dceb', // sky
  variable:    '#cba6f7', // mauve
  import:      '#6c7086', // overlay (intentionally dim — usually noise)
  enum:        '#f5c2e7', // pink
  struct:      '#eba0ac', // maroon
  trait:       '#94e2d5', // teal
  type_alias:  '#b4befe', // lavender
  enum_member: '#f2cdcd', // flamingo
} as const;

/**
 * Default radius (px) for each node kind.
 * Larger for structurally important kinds (file, class), smaller for leaves.
 */
export const NODE_SIZES: Record<string, number> = {
  file:        10,
  class:       9,
  function:    7,
  method:      6,
  variable:    5,
  import:      4,
  enum:        8,
  struct:      9,
  trait:       8,
  type_alias:  6,
  enum_member: 5,
} as const;

/**
 * Hex color for each edge kind. Muted, low-contrast tones so the mesh of
 * edges recedes behind the nodes and only reads as structure, not noise.
 */
export const EDGE_COLORS: Record<string, string> = {
  contains:     '#313244', // surface — barely-there structural scaffolding
  calls:        '#5b6c9c', // muted blue
  imports:      '#494d64', // dim slate
  instantiates: '#9d7a5c', // muted peach
  extends:      '#9c5d70', // muted rose
} as const;

/**
 * Stroke width (px) for each edge kind.
 * Structural edges (contains) are thin; semantic edges are thicker.
 */
export const EDGE_WIDTHS: Record<string, number> = {
  contains:     1,
  calls:        1.5,
  imports:      1,
  instantiates: 1.5,
  extends:      2,
} as const;

/**
 * Human-readable display label for each node kind.
 */
export const NODE_LABELS: Record<string, string> = {
  file:        'File',
  class:       'Class',
  function:    'Function',
  method:      'Method',
  variable:    'Variable',
  import:      'Import',
  enum:        'Enum',
  struct:      'Struct',
  trait:       'Trait',
  type_alias:  'Type Alias',
  enum_member: 'Enum Member',
} as const;

/**
 * Human-readable display label for each edge kind.
 */
export const EDGE_LABELS: Record<string, string> = {
  contains:     'Contains',
  calls:        'Calls',
  imports:      'Imports',
  instantiates: 'Instantiates',
  extends:      'Extends',
} as const;

/** Default fallback color when node kind is unknown. */
const FALLBACK_NODE_COLOR = '#7f849c'; // overlay

/** Default fallback color when edge kind is unknown. */
const FALLBACK_EDGE_COLOR = '#313244'; // surface

/**
 * Get the hex color for a given node kind, with a safe fallback.
 */
export function getNodeColor(kind: string): string {
  return NODE_COLORS[kind] ?? FALLBACK_NODE_COLOR;
}

/**
 * Get the hex color for a given edge kind, with a safe fallback.
 */
export function getEdgeColor(kind: string): string {
  return EDGE_COLORS[kind] ?? FALLBACK_EDGE_COLOR;
}

/**
 * Get the display radius for a given node kind, with a safe fallback.
 */
export function getNodeSize(kind: string): number {
  return NODE_SIZES[kind] ?? 6;
}

/**
 * Get the stroke width for a given edge kind, with a safe fallback.
 */
export function getEdgeWidth(kind: string): number {
  return EDGE_WIDTHS[kind] ?? 1;
}

/**
 * Get the display label for a node kind.
 */
export function getNodeLabel(kind: string): string {
  return NODE_LABELS[kind] ?? kind;
}

/**
 * Get the display label for an edge kind.
 */
export function getEdgeLabel(kind: string): string {
  return EDGE_LABELS[kind] ?? kind;
}
