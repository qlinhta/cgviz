// ---------------------------------------------------------------------------
// useGraphFocus (2D) — the Sigma counterpart of the 3D focus mode.
//
// When a node is selected, gather its multi-hop cluster (callers + callees out
// to `focusDepth`) into a tidy sub-layout at the centre, dim the rest of the
// graph as a backdrop, and fit the camera to the cluster. Deselecting restores
// every node to its original galaxy position. The actual dimming / direction
// colouring / labelling is done in the reducers (styles.ts) from the returned
// focus state.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { animateNodes } from 'sigma/utils';
import type Sigma from 'sigma';
import type GraphologyGraph from 'graphology';

import { useGraphStore } from '../stores/graphStore';
import { useLayoutStore } from '../stores/layoutStore';
import { reachableCluster } from './cluster';

export interface FocusState {
  cluster: Set<string> | null;
  oneHop: Set<string> | null;
  focal: string | null;
}

const EMPTY: FocusState = { cluster: null, oneHop: null, focal: null };

/**
 * Centre the camera on the focal node and zoom IN to fit its immediate
 * neighbourhood (`framing` = focal + 1-hop). The bbox is made symmetric around
 * the focal so the clicked node stays dead-centre, and we always zoom toward it
 * rather than fitting the whole (possibly huge) cluster.
 */
function fitToCluster(
  sigma: Sigma,
  graph: GraphologyGraph,
  focalId: string,
  framing: Set<string>,
) {
  if (!graph.hasNode(focalId)) return;
  const fp = sigma.graphToViewport({
    x: graph.getNodeAttribute(focalId, 'x') as number,
    y: graph.getNodeAttribute(focalId, 'y') as number,
  });

  let halfW = 0;
  let halfH = 0;
  framing.forEach((id) => {
    if (!graph.hasNode(id)) return;
    const vp = sigma.graphToViewport({
      x: graph.getNodeAttribute(id, 'x') as number,
      y: graph.getNodeAttribute(id, 'y') as number,
    });
    halfW = Math.max(halfW, Math.abs(vp.x - fp.x));
    halfH = Math.max(halfH, Math.abs(vp.y - fp.y));
  });

  const { width, height } = sigma.getDimensions();
  const bboxW = Math.max(60, halfW * 2);
  const bboxH = Math.max(60, halfH * 2);
  const margin = 0.78;
  const fit = Math.min((width * margin) / bboxW, (height * margin) / bboxH);

  const camera = sigma.getCamera();
  const focalFramed = sigma.viewportToFramedGraph(fp);
  camera.animate(
    { x: focalFramed.x, y: focalFramed.y, ratio: camera.ratio / fit },
    { duration: 600 },
  );
}

export function useGraphFocus(sigma: Sigma | null, graph: GraphologyGraph): FocusState {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const focusDepth = useLayoutStore((s) => s.focusDepth);

  const [focus, setFocus] = useState<FocusState>(EMPTY);
  // Snapshot of every node's galaxy position, taken when focus is first entered.
  const savedRef = useRef<Map<string, { x: number; y: number }> | null>(null);

  useEffect(() => {
    if (!sigma) return;

    const canFocus = selectedNodeId && graph.hasNode(selectedNodeId);
    const cluster = canFocus
      ? reachableCluster(selectedNodeId!, (id) => graph.neighbors(id), focusDepth)
      : null;

    if (cluster && cluster.size > 1) {
      // Release any frozen camera bbox (e.g. left by a drag) so the focus zoom
      // computes against the live extent rather than a stale one.
      if (sigma.getCustomBBox()) sigma.setCustomBBox(null);

      // Snapshot original positions on first entry into focus.
      if (!savedRef.current) {
        const snap = new Map<string, { x: number; y: number }>();
        graph.forEachNode((id, a) =>
          snap.set(id, { x: a.x as number, y: a.y as number }),
        );
        savedRef.current = snap;
      }

      // One-hop set (focal + direct neighbours) — these get labels.
      const oneHop = new Set<string>([selectedNodeId!]);
      graph.forEachNeighbor(selectedNodeId!, (nb) => {
        if (cluster.has(nb)) oneHop.add(nb);
      });

      // Lay the cluster out on its own, centred at the origin.
      const temp = new Graph();
      for (const id of cluster) {
        temp.addNode(id, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          // Uniform, generous size so adjustSizes keeps clear gaps between
          // nodes (display nodes are much smaller → readable, non-overlapping).
          size: 18,
        });
      }
      graph.forEachEdge((_e, _a, s, t) => {
        if (cluster.has(s) && cluster.has(t) && s !== t && !temp.hasEdge(s, t)) {
          try {
            temp.addEdge(s, t);
          } catch {
            /* parallel edge */
          }
        }
      });
      forceAtlas2.assign(temp, {
        iterations: 600,
        settings: {
          gravity: 0.8,
          scalingRatio: 24,
          barnesHutOptimize: false,
          slowDown: 8,
          adjustSizes: true, // honour the size → real spacing between nodes
        },
      });

      let cx = 0;
      let cy = 0;
      temp.forEachNode((_id, a) => {
        cx += a.x as number;
        cy += a.y as number;
      });
      cx /= temp.order;
      cy /= temp.order;

      // The temp layout's scale grows with node count; left as-is, a big hub
      // produces a cluster LARGER than the galaxy, so the camera fit ends up
      // zooming OUT. Rescale the cluster to a consistent fraction of the galaxy
      // extent so focus always zooms IN by a similar amount regardless of size.
      let gcx = 0;
      let gcy = 0;
      savedRef.current.forEach((p) => {
        gcx += p.x;
        gcy += p.y;
      });
      const gn = savedRef.current.size || 1;
      gcx /= gn;
      gcy /= gn;
      let galaxyR = 1;
      savedRef.current.forEach((p) => {
        galaxyR = Math.max(galaxyR, Math.hypot(p.x - gcx, p.y - gcy));
      });
      let clusterR = 1;
      temp.forEachNode((_id, a) => {
        clusterR = Math.max(
          clusterR,
          Math.hypot((a.x as number) - cx, (a.y as number) - cy),
        );
      });
      const scale = (galaxyR * 0.42) / clusterR;

      // Targets: cluster nodes → centred + rescaled sub-layout; everyone else →
      // their original galaxy position (so nodes that left the cluster return).
      const targets: Record<string, { x: number; y: number }> = {};
      temp.forEachNode((id, a) => {
        targets[id] = {
          x: ((a.x as number) - cx) * scale,
          y: ((a.y as number) - cy) * scale,
        };
      });
      savedRef.current.forEach((p, id) => {
        if (!cluster.has(id) && graph.hasNode(id)) targets[id] = { x: p.x, y: p.y };
      });

      animateNodes(graph, targets, { duration: 650, easing: 'quadraticInOut' }, () => {
        fitToCluster(sigma, graph, selectedNodeId!, oneHop);
      });
      setFocus({ cluster, oneHop, focal: selectedNodeId! });
      return;
    }

    // Not focusing — restore galaxy positions if we were.
    if (savedRef.current) {
      const targets: Record<string, { x: number; y: number }> = {};
      savedRef.current.forEach((p, id) => {
        if (graph.hasNode(id)) targets[id] = { x: p.x, y: p.y };
      });
      animateNodes(graph, targets, { duration: 650, easing: 'quadraticInOut' }, () => {
        sigma.getCamera().animatedReset({ duration: 400 });
      });
      savedRef.current = null;
    }
    setFocus(EMPTY);
  }, [sigma, graph, selectedNodeId, focusDepth]);

  return focus;
}
