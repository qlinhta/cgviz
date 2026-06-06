// ---------------------------------------------------------------------------
// Shared cluster computation — the "focus" set for a selected node.
//
// Breadth-first over an undirected view of the graph (callers AND callees), out
// to `depth` hops, capped at `maxNodes`. Returns the set of node ids that make
// up the focused node's neighbourhood (the node, its relations, and the chains
// between them).
// ---------------------------------------------------------------------------

/** How far the focus cluster reaches. */
export const FOCUS_DEPTH = 4;
/** Hard cap so a hub node doesn't pull in half the graph. */
export const FOCUS_MAX_NODES = 120;

export function reachableCluster(
  root: string,
  neighborsOf: (id: string) => Iterable<string>,
  depth: number = FOCUS_DEPTH,
  maxNodes: number = FOCUS_MAX_NODES,
): Set<string> {
  const visited = new Set<string>([root]);
  let frontier = [root];
  for (let d = 0; d < depth && visited.size < maxNodes; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of neighborsOf(id)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          next.push(nb);
          if (visited.size >= maxNodes) break;
        }
      }
      if (visited.size >= maxNodes) break;
    }
    frontier = next;
  }
  return visited;
}
