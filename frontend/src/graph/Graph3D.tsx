// ---------------------------------------------------------------------------
// Graph3D — immersive 3D rendering via react-force-graph-3d (Three.js).
//
// Galaxy mode: the whole graph as a rotatable cloud.
// Focus mode (a node is selected): the node's multi-hop cluster (callers +
// callees + the chains between them) is GATHERED into the centre by a custom
// attraction force while the rest of the galaxy is frozen and dimmed as a
// backdrop. The focal node is pinned dead-centre, cluster edges are coloured by
// call direction with flowing particles, and every cluster node carries a 3D
// text label so the cluster is self-describing. Selecting a neighbour walks the
// focus to it; Escape / background-click returns to the galaxy.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';

import { useGraph } from '../api/hooks';
import { useGraphStore } from '../stores/graphStore';
import { useUiStore } from '../stores/uiStore';
import { useLayoutStore } from '../stores/layoutStore';
import { getNodeColor, getEdgeColor } from '../lib/colors';
import { reachableCluster } from './cluster';

// Backdrop (out-of-cluster) styling.
const DIM_NODE = '#20202b';
const DIM_LINK = 'rgba(60, 60, 80, 0.06)';
// Focus-mode edge colours, by direction relative to the focal node.
const EDGE_OUT = '#89dceb'; // focal → X  (what it calls)
const EDGE_IN = '#fab387'; // X → focal  (what calls it)
const EDGE_BETWEEN = '#7f84a0'; // neighbour ↔ neighbour
const PARTICLE_COLOR = '#cdd6f4';

interface NodeInfo {
  id: string;
  name: string;
  kind: string;
  color: string;
  val: number;
}
interface Edge {
  source: string;
  target: string;
  kind: string;
}

export default function Graph3D() {
  const filters = useGraphStore((s) => s.filters);
  const selectNode = useGraphStore((s) => s.selectNode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const focusDepth = useLayoutStore((s) => s.focusDepth);
  const setFocusDepth = useLayoutStore((s) => s.setFocusDepth);
  const { data, isLoading } = useGraph(filters);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const framedRef = useRef(false);
  const forceReadyRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forceNodesRef = useRef<any[]>([]);
  const clusterRef = useRef<Set<string> | null>(null);
  const focalRef = useRef<string | null>(null);
  // True while we've narrowed the link force to intra-cluster links (focus).
  const linksFilteredRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Keep the canvas sized to its panel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Parse the raw graph once: node info, edges, undirected adjacency.
  const base = useMemo(() => {
    if (!data) return null;
    const degree = new Map<string, number>();
    for (const e of data.edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    const info = new Map<string, NodeInfo>();
    for (const n of data.nodes) {
      info.set(n.id, {
        id: n.id,
        name: n.name,
        kind: n.kind ?? 'unknown',
        color: getNodeColor(n.kind ?? 'unknown'),
        val: 1 + Math.log2((degree.get(n.id) ?? 0) + 1) * 1.6,
      });
    }
    const edges: Edge[] = data.edges
      .filter((e) => info.has(e.source) && info.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, kind: e.kind ?? 'unknown' }));
    const adj = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a)!.add(b);
    };
    for (const e of edges) {
      link(e.source, e.target);
      link(e.target, e.source);
    }
    return { info, edges, adj };
  }, [data]);

  // The graph object handed to the renderer — always the full graph, stable so
  // positions persist across focus toggles.
  const graphData = useMemo(() => {
    if (!base) return { nodes: [] as NodeInfo[], links: [] as Edge[] };
    return {
      nodes: [...base.info.values()].map((i) => ({ ...i })),
      links: base.edges.map((e) => ({ ...e })),
    };
  }, [base]);

  // The focused node's cluster (multi-hop, both directions, depth from store).
  const clusterSet = useMemo(() => {
    if (!base || !selectedNodeId || !base.info.has(selectedNodeId)) return null;
    const set = reachableCluster(
      selectedNodeId,
      (id) => base.adj.get(id) ?? [],
      focusDepth,
    );
    return set.size > 1 ? set : null;
  }, [base, selectedNodeId, focusDepth]);

  // Only the focal node + its direct neighbours get text labels (keeps the
  // scene legible — deeper nodes are explored by hovering / walking focus).
  const labelSet = useMemo(() => {
    if (!base || !selectedNodeId || !clusterSet) return null;
    const set = new Set<string>([selectedNodeId]);
    for (const nb of base.adj.get(selectedNodeId) ?? []) {
      if (clusterSet.has(nb)) set.add(nb);
    }
    return set;
  }, [base, selectedNodeId, clusterSet]);

  const focused = clusterSet !== null;
  clusterRef.current = clusterSet;
  focalRef.current = selectedNodeId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endpoints = (l: any): [string, string] => [
    typeof l.source === 'object' ? l.source.id : l.source,
    typeof l.target === 'object' ? l.target.id : l.target,
  ];

  // Pin the focal node at the origin, let cluster nodes flow (they get pulled
  // in by the custom force), and freeze everything else where it is so the
  // galaxy stays put as a dim backdrop.
  const applyPins = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    framedRef.current = false;

    // Register the centre-pull force once.
    if (!forceReadyRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const force: any = (alpha: number) => {
        const cluster = clusterRef.current;
        if (!cluster) return;
        // Gentle in-plane centering (links already anchor the cluster to the
        // pinned focal), but STRONG z-flattening so the cluster settles onto a
        // plane we can view head-on — the single camera angle then sees a clean
        // node-link diagram with no front/back occlusion.
        const kxy = 0.03 * alpha;
        const kz = 0.35 * alpha;
        for (const n of forceNodesRef.current) {
          if (!cluster.has(n.id)) continue;
          n.vx -= n.x * kxy;
          n.vy -= n.y * kxy;
          n.vz -= n.z * kz;
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      force.initialize = (nodes: any[]) => {
        forceNodesRef.current = nodes;
      };
      fg.d3Force('focusPull', force);
      forceReadyRef.current = true;
    }

    const cluster = clusterSet;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of graphData.nodes as any[]) {
      if (cluster && cluster.has(n.id)) {
        // Seed in a roomy central disc (thin in z) and let the force layout run
        // free — the hub naturally settles in the middle, callees spread around
        // it. A gentle pull keeps it centred; z is flattened to a plane.
        n.x = (Math.random() - 0.5) * 160;
        n.y = (Math.random() - 0.5) * 160;
        n.z = (Math.random() - 0.5) * 30;
        n.vx = 0;
        n.vy = 0;
        n.vz = 0;
        delete n.fx;
        delete n.fy;
        delete n.fz;
      } else if (cluster) {
        // freeze backdrop nodes in place
        n.fx = n.x;
        n.fy = n.y;
        n.fz = n.z;
      } else {
        delete n.fx;
        delete n.fy;
        delete n.fz;
      }
    }

    // Tune forces, and (crucially) make the link force ignore links that leave
    // the cluster — otherwise cluster nodes get yanked back toward their frozen
    // galaxy neighbours and never gather.
    const charge = fg.d3Force('charge');
    const linkForce = fg.d3Force('link');
    // d3-force mutates these link objects in place (source/target become node
    // refs), so our memoised list IS the live one the force operates on.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allLinks: any[] = graphData.links;
    if (cluster) {
      // Strong repulsion + roomy links so nodes separate and labels don't pile
      // up (you only get one camera angle, so overlap must be minimised).
      charge?.strength(-150);
      linkForce?.distance(50).strength(0.9);
      const intra = allLinks.filter((l) => {
        const [s, t] = endpoints(l);
        return cluster.has(s) && cluster.has(t);
      });
      // Guard: d3-force throws if it can't resolve a link endpoint against the
      // force's (possibly not-yet-synced) node set.
      try {
        linkForce?.links(intra);
        linksFilteredRef.current = true;
      } catch {
        /* node set not in sync yet — skip this round */
      }
    } else {
      charge?.strength(-14);
      linkForce?.distance(26).strength(1);
      // Only restore the full link set if WE narrowed it (for focus). On a
      // plain view-mode switch, react-force-graph already owns the links —
      // touching them here races its internal node sync and crashes.
      if (linksFilteredRef.current) {
        try {
          linkForce?.links(allLinks);
        } catch {
          /* will be reset by react-force-graph on next data sync */
        }
        linksFilteredRef.current = false;
      }
    }
    fg.d3ReheatSimulation();
  }, [clusterSet, selectedNodeId, graphData]);

  useEffect(() => {
    applyPins();
  }, [applyPins]);

  // Frame the result once the sim cools.
  const handleEngineStop = () => {
    const fg = fgRef.current;
    if (!fg || framedRef.current) return;
    framedRef.current = true;

    if (clusterSet) {
      // The cluster is flattened onto the z≈0 plane. View it head-on (down the
      // z axis), centred on the cluster's centroid so it fills the frame, with
      // margin so nothing clips.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const members = (graphData.nodes as any[]).filter(
        (n) => clusterSet.has(n.id) && n.x != null,
      );
      let cx = 0;
      let cy = 0;
      for (const n of members) {
        cx += n.x;
        cy += n.y;
      }
      if (members.length) {
        cx /= members.length;
        cy /= members.length;
      }
      let maxR = 1;
      for (const n of members) {
        maxR = Math.max(maxR, Math.hypot(n.x - cx, n.y - cy));
      }
      const distance = maxR * 2.1 + 80;
      fg.cameraPosition({ x: cx, y: cy, z: distance }, { x: cx, y: cy, z: 0 }, 1300);
      return;
    }

    fg.zoomToFit(700, 20);
    setTimeout(() => {
      const p = fg.cameraPosition();
      fg.cameraPosition(
        { x: p.x * 0.6, y: p.y * 0.6, z: p.z * 0.6 },
        { x: 0, y: 0, z: 0 },
        1000,
      );
    }, 750);
  };

  // --- accessors ---

  const nodeColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => (!focused || clusterSet!.has(n.id) ? n.color : DIM_NODE),
    [focused, clusterSet],
  );

  // Enlarge the focal node so it's unmistakable amid its neighbours.
  const nodeVal = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => (focused && n.id === selectedNodeId ? n.val * 3 + 6 : n.val),
    [focused, selectedNodeId],
  );

  const linkColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => {
      if (!focused) return getEdgeColor(l.kind);
      const [s, t] = endpoints(l);
      if (!clusterSet!.has(s) || !clusterSet!.has(t)) return DIM_LINK;
      if (s === selectedNodeId) return EDGE_OUT;
      if (t === selectedNodeId) return EDGE_IN;
      return EDGE_BETWEEN;
    },
    [focused, clusterSet, selectedNodeId],
  );

  const linkWidth = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => {
      if (!focused) return 0.4;
      const [s, t] = endpoints(l);
      if (!clusterSet!.has(s) || !clusterSet!.has(t)) return 0.3;
      return s === selectedNodeId || t === selectedNodeId ? 1.8 : 0.8;
    },
    [focused, clusterSet, selectedNodeId],
  );

  const linkParticles = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => {
      if (!focused) return 0;
      const [s, t] = endpoints(l);
      return clusterSet!.has(s) && clusterSet!.has(t) ? 2 : 0;
    },
    [focused, clusterSet],
  );

  // 3D text labels for the focal node + its direct neighbours only. Rendered
  // ALWAYS ON TOP (depthTest off) so they're never hidden behind spheres —
  // critical because the viewer only has one camera angle.
  const nodeThreeObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => {
      if (!focused || !labelSet || !labelSet.has(n.id)) return undefined;
      const isFocal = n.id === selectedNodeId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sprite: any = new SpriteText(n.name);
      sprite.color = isFocal ? '#ffffff' : '#e4e4ef';
      sprite.textHeight = isFocal ? 8 : 5;
      sprite.fontWeight = isFocal ? '700' : '600';
      sprite.fontSize = 96; // canvas resolution — crisp text when zoomed in
      sprite.backgroundColor = isFocal ? 'rgba(99,102,241,0.85)' : 'rgba(17,17,27,0.82)';
      sprite.padding = 2;
      sprite.borderRadius = 3;
      sprite.position.set(0, 10 + n.val * 0.6, 0);
      // Draw labels over everything regardless of depth.
      sprite.material.depthTest = false;
      sprite.material.depthWrite = false;
      sprite.renderOrder = 999;
      return sprite;
    },
    [focused, labelSet, selectedNodeId],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 bg-graph-bg">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm pointer-events-none">
          Loading graph...
        </div>
      )}
      {focused && (
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-md bg-bg-secondary/85 px-3 py-2 text-2xs text-text-secondary backdrop-blur">
          <div>
            <span className="text-text-primary font-medium">Focus</span> · {clusterSet!.size}{' '}
            nodes · <span style={{ color: EDGE_OUT }}>→ outgoing</span>{' '}
            <span style={{ color: EDGE_IN }}>← incoming</span>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-text-muted">Depth</span>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={focusDepth}
              onChange={(e) => setFocusDepth(Number(e.target.value))}
              className="h-1 w-28 cursor-pointer accent-accent"
            />
            <span className="w-3 text-text-primary tabular-nums">{focusDepth}</span>
          </label>
        </div>
      )}
      {size.w > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={size.w}
          height={size.h}
          graphData={graphData}
          backgroundColor="#08080d"
          showNavInfo={false}
          onEngineStop={handleEngineStop}
          nodeRelSize={focused ? 6 : 8}
          nodeColor={nodeColor}
          nodeVal={nodeVal}
          nodeLabel={(n: object) => (n as NodeInfo).name}
          nodeOpacity={focused ? 0.82 : 0.95}
          nodeResolution={16}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend
          linkColor={linkColor}
          linkOpacity={focused ? 0.7 : 0.22}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={focused ? 3.5 : 0}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={linkColor}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={2.2}
          linkDirectionalParticleSpeed={0.012}
          linkDirectionalParticleColor={() => PARTICLE_COLOR}
          warmupTicks={focused ? 60 : 30}
          cooldownTicks={focused ? 220 : 140}
          onNodeClick={(n: object) => {
            selectNode((n as NodeInfo).id);
            setSidebarTab('detail');
          }}
          onBackgroundClick={() => clearSelection()}
        />
      )}
    </div>
  );
}
