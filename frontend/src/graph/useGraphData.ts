import { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import type Sigma from 'sigma';

import { useGraph } from '../api/hooks';
import { useGraphStore } from '../stores/graphStore';
import { getNodeColor, getNodeSize, getEdgeColor, getEdgeWidth } from './styles';

export interface UseGraphDataResult {
  isLoading: boolean;
  error: Error | null;
  nodeCount: number;
  edgeCount: number;
  dataVersion: number;
}

export function useGraphData(sigma: Sigma): UseGraphDataResult {
  const filters = useGraphStore((s) => s.filters);
  const { data, isLoading, error } = useGraph(filters);

  const loadedFingerprintRef = useRef('');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!data || data.nodes.length === 0) return;

    const edgeKinds = filters.edge_kinds?.join(',') ?? 'all';
    const fp = `${data.nodes.length}:${data.edges.length}:${edgeKinds}`;
    if (fp === loadedFingerprintRef.current) return;
    loadedFingerprintRef.current = fp;

    const g = new Graph({ multi: true, type: 'directed' });

    for (const node of data.nodes) {
      const kind = node.kind ?? 'unknown';
      const base = getNodeSize(kind);
      g.addNode(node.id, {
        kind,
        label: node.name,
        // Start in a tight central cluster so the force layout visibly
        // "explodes" outward into structure.
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        size: base,
        baseSize: base,
        color: getNodeColor(kind),
        filePath: node.file_path,
        language: node.language,
        qualifiedName: node.qualified_name,
        // Random phase so ambient breathing is desynchronised per node.
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (const edge of data.edges) {
      const kind = edge.kind ?? 'unknown';
      if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue;
      try {
        g.addEdge(edge.source, edge.target, {
          kind,
          label: kind,
          size: getEdgeWidth(kind),
          color: getEdgeColor(kind),
        });
      } catch {
        // duplicate multi-edge
      }
    }

    // Scale node size by connectivity so hubs stand out visually.
    g.forEachNode((id, attrs) => {
      const base = (attrs.baseSize as number) ?? (attrs.size as number);
      const deg = g.degree(id);
      const scaled = base * (1 + Math.log2(deg + 1) * 0.4);
      g.setNodeAttribute(id, 'size', Math.min(scaled, base * 4.5));
    });

    // Temporarily disable reducers so Sigma doesn't validate positions
    // through a reducer that might strip x/y during import.
    const prevNR = sigma.getSetting('nodeReducer');
    const prevER = sigma.getSetting('edgeReducer');
    sigma.setSetting('nodeReducer', null);
    sigma.setSetting('edgeReducer', null);

    const target = sigma.getGraph();
    if (target.order > 0) target.clear();
    target.import(g);

    sigma.setSetting('nodeReducer', prevNR);
    sigma.setSetting('edgeReducer', prevER);
    sigma.refresh();

    setDataVersion((v) => v + 1);
  }, [data, sigma]);

  return {
    isLoading,
    error: error as Error | null,
    nodeCount: data?.nodes.length ?? 0,
    edgeCount: data?.edges.length ?? 0,
    dataVersion,
  };
}
