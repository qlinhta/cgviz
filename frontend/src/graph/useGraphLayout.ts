import { useEffect, useRef } from 'react';
import type Graph from 'graphology';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { inferSettings } from 'graphology-layout-forceatlas2';
import { animateNodes } from 'sigma/utils';

import { useLayoutStore } from '../stores/layoutStore';
import { useGraphControlStore } from '../stores/graphControlStore';
import { radialLayout, hierarchicalLayout, treeLayout } from './layouts';

export interface UseGraphLayoutResult {
  isRunning: boolean;
}

/** How long the live force simulation runs before settling (ms). */
const FORCE_RUN_MS = 5000;

/** Duration of the animated transition into a static layout (ms). */
const TRANSITION_MS = 750;

/**
 * Drive the graph layout. Reacts to both `dataVersion` (new data loaded) and
 * the active `algorithm` in the layout store:
 *
 *  - `force`        → a live ForceAtlas2 simulation in a web worker; nodes
 *                     visibly flow and self-organise, then settle.
 *  - everything else → target positions computed synchronously, then animated
 *                      into place with an eased transition.
 */
export function useGraphLayout(graph: Graph, dataVersion: number): UseGraphLayoutResult {
  const algorithm = useLayoutStore((s) => s.algorithm);
  const setRunning = useLayoutStore((s) => s.setRunning);
  const isRunning = useLayoutStore((s) => s.isRunning);
  const setForceSupervisor = useGraphControlStore((s) => s.setForceSupervisor);

  const fa2Ref = useRef<FA2Layout | null>(null);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (dataVersion === 0 || graph.order === 0) return;

    // Tear down anything still running from a previous algorithm/data.
    if (fa2Ref.current) {
      fa2Ref.current.kill();
      fa2Ref.current = null;
      setForceSupervisor(null);
    }
    if (cancelAnimRef.current) {
      cancelAnimRef.current();
      cancelAnimRef.current = null;
    }

    if (algorithm === 'force') {
      // Live, animated force-directed simulation.
      const settings = inferSettings(graph);
      const layout = new FA2Layout(graph, {
        settings: { ...settings, slowDown: 8, gravity: 0.5, scalingRatio: 4 },
      });
      fa2Ref.current = layout;
      setForceSupervisor(layout); // expose to the drag hook
      layout.start();
      setRunning(true);

      const timer = setTimeout(() => {
        if (fa2Ref.current) {
          fa2Ref.current.stop();
        }
        setRunning(false);
      }, FORCE_RUN_MS);

      return () => {
        clearTimeout(timer);
        if (fa2Ref.current) {
          fa2Ref.current.kill();
          fa2Ref.current = null;
        }
        setForceSupervisor(null);
        setRunning(false);
      };
    }

    // Static layouts: compute targets, then glide into them.
    let targets;
    if (algorithm === 'radial') targets = radialLayout(graph);
    else if (algorithm === 'hierarchical') targets = hierarchicalLayout(graph);
    else targets = treeLayout(graph);

    setRunning(true);
    const cancel = animateNodes(
      graph,
      targets,
      { duration: TRANSITION_MS, easing: 'quadraticInOut' },
      () => setRunning(false),
    );
    cancelAnimRef.current = cancel;

    return () => {
      cancel();
      cancelAnimRef.current = null;
      setRunning(false);
    };
  }, [algorithm, dataVersion, graph, setRunning, setForceSupervisor]);

  return { isRunning };
}
