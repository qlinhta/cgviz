// ---------------------------------------------------------------------------
// Static layout algorithms — pure functions returning target {x,y} per node.
// These are applied with an animated transition (see useGraphLayout). The
// force-directed layout is handled separately by a live web-worker supervisor.
// ---------------------------------------------------------------------------

import type Graph from 'graphology';

export type Positions = Record<string, { x: number; y: number }>;

// Conceptual ordering of symbol kinds, from "top of the hierarchy" outward.
const KIND_ORDER = [
  'file',
  'class',
  'enum',
  'function',
  'method',
  'variable',
  'import',
  'unknown',
];

function kindRank(kind: string): number {
  const i = KIND_ORDER.indexOf(kind);
  return i === -1 ? KIND_ORDER.length : i;
}

// ---------------------------------------------------------------------------
// Shared helper: stack ordered groups as horizontal bands, wrapping each band
// into multiple centered rows so a single huge level doesn't become an
// unreadable thin strip. Keeps the overall block roughly balanced.
// ---------------------------------------------------------------------------

const X_GAP = 75;
const ROW_GAP = 75;
const BAND_GAP = 130;
const WRAP_WIDTH = 2600; // wrap a band once it exceeds this width

function stackedBands(orderedGroups: string[][]): Positions {
  const pos: Positions = {};
  const maxCols = Math.max(1, Math.floor(WRAP_WIDTH / X_GAP));

  // First pass: total height so we can vertically centre the block.
  let totalHeight = 0;
  for (const ids of orderedGroups) {
    if (ids.length === 0) continue;
    const cols = Math.min(ids.length, maxCols);
    const rows = Math.ceil(ids.length / cols);
    totalHeight += rows * ROW_GAP + BAND_GAP;
  }
  totalHeight -= BAND_GAP;

  let y = -totalHeight / 2;
  for (const ids of orderedGroups) {
    const n = ids.length;
    if (n === 0) continue;
    const cols = Math.min(n, maxCols);
    const rows = Math.ceil(n / cols);
    ids.forEach((id, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      // Centre each row (the final row is often shorter).
      const inRow = Math.min(cols, n - r * cols);
      const rowWidth = (inRow - 1) * X_GAP;
      // Negate y: Sigma's Y-axis points up, so negating puts the first group
      // (root / file layer) at the TOP of the screen.
      pos[id] = { x: c * X_GAP - rowWidth / 2, y: -(y + r * ROW_GAP) };
    });
    y += rows * ROW_GAP + BAND_GAP;
  }

  return pos;
}

// ---------------------------------------------------------------------------
// Radial — concentric rings, one ring per symbol kind.
// File nodes sit in the innermost ring, imports/unknown on the outside.
// ---------------------------------------------------------------------------

export function radialLayout(graph: Graph): Positions {
  const byKind = new Map<string, string[]>();
  graph.forEachNode((id, attrs) => {
    const k = (attrs.kind as string) ?? 'unknown';
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k)!.push(id);
  });

  const kinds = [...byKind.keys()].sort((a, b) => kindRank(a) - kindRank(b));
  const pos: Positions = {};
  const ringGap = 260;

  kinds.forEach((kind, ri) => {
    const ids = byKind.get(kind)!;
    const radius = (ri + 1) * ringGap;
    const n = ids.length;
    // Spread evenly; offset each ring a little so spokes don't line up.
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / n + ri * 0.35;
      pos[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  });

  return pos;
}

// ---------------------------------------------------------------------------
// Hierarchical — horizontal layers stacked top→bottom by kind.
// file → class/enum → function/method → variable → import.
// ---------------------------------------------------------------------------

function hierLayer(kind: string): number {
  switch (kind) {
    case 'file':
      return 0;
    case 'class':
    case 'enum':
      return 1;
    case 'function':
    case 'method':
      return 2;
    case 'variable':
      return 3;
    case 'import':
      return 4;
    default:
      return 5;
  }
}

export function hierarchicalLayout(graph: Graph): Positions {
  const layers = new Map<number, { id: string; sort: string }[]>();

  graph.forEachNode((id, attrs) => {
    const layer = hierLayer((attrs.kind as string) ?? 'unknown');
    if (!layers.has(layer)) layers.set(layer, []);
    const sort = `${(attrs.filePath as string) ?? ''}:${(attrs.label as string) ?? ''}`;
    layers.get(layer)!.push({ id, sort });
  });

  // Order layers top→bottom; keep same-file symbols adjacent within each.
  const orderedGroups = [...layers.keys()]
    .sort((a, b) => a - b)
    .map((layer) => {
      const arr = layers.get(layer)!;
      arr.sort((a, b) => a.sort.localeCompare(b.sort));
      return arr.map((item) => item.id);
    });

  return stackedBands(orderedGroups);
}

// ---------------------------------------------------------------------------
// Tree — BFS layering rooted at the most-connected node.
// Unreachable nodes are dropped onto an extra final row.
// ---------------------------------------------------------------------------

export function treeLayout(graph: Graph): Positions {
  const pos: Positions = {};
  if (graph.order === 0) return pos;

  // Root = highest-degree node (the natural hub of the graph).
  let root = '';
  let maxDeg = -1;
  graph.forEachNode((id) => {
    const d = graph.degree(id);
    if (d > maxDeg) {
      maxDeg = d;
      root = id;
    }
  });

  // Breadth-first assignment of depth from the root.
  const depth = new Map<string, number>();
  const queue: string[] = [root];
  depth.set(root, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    graph.forEachNeighbor(cur, (nb) => {
      if (!depth.has(nb)) {
        depth.set(nb, d + 1);
        queue.push(nb);
      }
    });
  }

  // Disconnected nodes go on a final extra level.
  let maxD = 0;
  depth.forEach((d) => {
    if (d > maxD) maxD = d;
  });
  graph.forEachNode((id) => {
    if (!depth.has(id)) depth.set(id, maxD + 1);
  });

  // Group nodes by depth, then stack each depth as a wrapped band.
  const levels = new Map<number, string[]>();
  depth.forEach((d, id) => {
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(id);
  });

  const orderedGroups = [...levels.keys()]
    .sort((a, b) => a - b)
    .map((d) => levels.get(d)!);

  return stackedBands(orderedGroups);
}
