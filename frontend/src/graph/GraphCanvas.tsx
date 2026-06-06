import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { SigmaContainer, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import EdgeCurveProgram from '@sigma/edge-curve';

// Lazy-loaded so the Three.js bundle only downloads when 3D is activated.
const Graph3D = lazy(() => import('./Graph3D'));

import { useGraphData } from './useGraphData';
import { useGraphEvents } from './useGraphEvents';
import { useGraphLayout } from './useGraphLayout';
import { useGraphDrag } from './useGraphDrag';
import { useAmbientMotion } from './useAmbientMotion';
import { useGraphFocus } from './useGraphFocus';
import { makeDrawNodeLabel, makeDrawNodeHover } from './labelRenderer';
import {
  nodeReducer,
  edgeReducer,
  LABEL_SIZE,
  LABEL_COLOR,
  type GraphHighlightState,
  type NodeAttributes,
  type EdgeAttributes,
} from './styles';
import { useGraphStore } from '../stores/graphStore';
import { useUiStore } from '../stores/uiStore';
import { useGraphControlStore } from '../stores/graphControlStore';
import { useLayoutStore } from '../stores/layoutStore';

function GraphDataLoader() {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const { isLoading, error, dataVersion } = useGraphData(sigma);

  useGraphLayout(graph, dataVersion);

  const lastCameraVersionRef = useRef(0);
  useEffect(() => {
    if (dataVersion === 0 || graph.order === 0) return;
    if (dataVersion === lastCameraVersionRef.current) return;
    lastCameraVersionRef.current = dataVersion;
    const timer = setTimeout(() => {
      sigma.getCamera().animatedReset({ duration: 500 });
    }, 250);
    return () => clearTimeout(timer);
  }, [sigma, dataVersion, graph]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm pointer-events-none">
        Failed to load graph data
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm pointer-events-none">
        Loading graph...
      </div>
    );
  }

  return null;
}

function GraphEventsController() {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const setSigma = useGraphControlStore((s) => s.setSigma);

  // Expose the live renderer to chrome rendered outside the container.
  useEffect(() => {
    setSigma(sigma);
    return () => setSigma(null);
  }, [sigma, setSigma]);

  useGraphDrag(sigma, graph);
  useAmbientMotion(sigma);
  const focus = useGraphFocus(sigma, graph);
  const focusDepth = useLayoutStore((s) => s.focusDepth);
  const setFocusDepth = useLayoutStore((s) => s.setFocusDepth);

  const { highlightedNeighbors } = useGraphEvents(sigma, graph);

  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const searchQuery = useGraphStore((s) => s.searchQuery);

  const highlightState = useMemo<GraphHighlightState>(
    () => ({
      hoveredNode: hoveredNodeId,
      selectedNode: selectedNodeId,
      highlightedNeighbors,
      searchQuery: searchQuery || null,
      focusCluster: focus.cluster,
      focusOneHop: focus.oneHop,
      focalNode: focus.focal,
    }),
    [hoveredNodeId, selectedNodeId, highlightedNeighbors, searchQuery, focus],
  );

  const stateRef = useRef(highlightState);
  stateRef.current = highlightState;

  useEffect(() => {
    if (!sigma) return;

    sigma.setSetting(
      'nodeReducer',
      (nodeKey: string, attrs: Record<string, unknown>) =>
        nodeReducer(stateRef.current, nodeKey, attrs as NodeAttributes),
    );

    sigma.setSetting(
      'edgeReducer',
      (edgeKey: string, attrs: Record<string, unknown>) => {
        const source = graph.source(edgeKey);
        const target = graph.target(edgeKey);
        return edgeReducer(
          stateRef.current,
          edgeKey,
          attrs as EdgeAttributes,
          source,
          target,
        );
      },
    );
  }, [sigma, graph]);

  useEffect(() => {
    if (!sigma) return;
    // Focus toggles whole-node recolouring (dim backdrop), which needs a full
    // refresh to re-upload the WebGL buffers; hover/search highlight is cheap
    // enough to do incrementally.
    if (focus.cluster) sigma.refresh();
    else sigma.refresh({ skipIndexation: true });
  }, [sigma, highlightState, focus]);

  if (!focus.cluster) return null;

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-md bg-bg-secondary/85 px-3 py-2 text-2xs text-text-secondary backdrop-blur">
      <div>
        <span className="text-text-primary font-medium">Focus</span> · {focus.cluster.size}{' '}
        nodes · <span style={{ color: '#89dceb' }}>→ outgoing</span>{' '}
        <span style={{ color: '#fab387' }}>← incoming</span>
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
  );
}

export function GraphCanvas() {
  const theme = useUiStore((s) => s.theme);
  const dimension = useLayoutStore((s) => s.dimension);
  const graph = useMemo(() => new Graph({ multi: true, type: 'directed' }), []);

  const sigmaSettings = useMemo(
    () => ({
      allowInvalidContainer: true,
      renderLabels: true,
      renderEdgeLabels: false,
      labelSize: LABEL_SIZE,
      labelColor: { color: LABEL_COLOR[theme] },
      labelRenderedSizeThreshold: 8,
      // It's source code — render identifiers in a monospace face.
      labelFont: '"JetBrains Mono", ui-monospace, monospace',
      labelWeight: '500',
      // Readable label pills + soft glow on hover.
      defaultDrawNodeLabel: makeDrawNodeLabel(theme),
      defaultDrawNodeHover: makeDrawNodeHover(theme),
      defaultNodeType: 'circle',
      // Curved edges for a softer, more organic mesh.
      defaultEdgeType: 'curve',
      edgeProgramClasses: { curve: EdgeCurveProgram },
      edgeLabelSize: 10,
      zIndex: true,
      minCameraRatio: 0.05,
      maxCameraRatio: 10,
    }),
    [theme],
  );

  if (dimension === '3d') {
    return (
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm">
              Loading 3D engine…
            </div>
          }
        >
          <Graph3D />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <SigmaContainer
        graph={graph}
        style={{ width: '100%', height: '100%' }}
        settings={sigmaSettings}
        className="graph-canvas"
      >
        <GraphDataLoader />
        <GraphEventsController />
      </SigmaContainer>
    </div>
  );
}

export default GraphCanvas;
