// ---------------------------------------------------------------------------
// useGraphDrag — grab and drag nodes, with live physics.
//
// In force mode, grabbing a node wakes the ForceAtlas2 simulation so its
// neighbours flow and re-settle in response (Obsidian-style). In the static
// layouts the node simply follows the cursor. The camera is pinned during a
// drag so the view doesn't recenter underneath you.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import type Sigma from 'sigma';
import type Graph from 'graphology';
import type { MouseCoords } from 'sigma/types';

import { useGraphControlStore } from '../stores/graphControlStore';
import { useLayoutStore } from '../stores/layoutStore';

/** How long the simulation keeps simmering after a drop, then stops. */
const SETTLE_AFTER_DROP_MS = 1500;

export function useGraphDrag(sigma: Sigma | null, graph: Graph): void {
  useEffect(() => {
    if (!sigma) return;

    let draggedNode: string | null = null;
    let stopTimer: number | undefined;
    const mouse = sigma.getMouseCaptor();

    const wakeSimulation = () => {
      if (useLayoutStore.getState().algorithm !== 'force') return;
      clearTimeout(stopTimer);
      useGraphControlStore.getState().forceSupervisor?.start();
    };

    const onDownNode = ({ node }: { node: string }) => {
      draggedNode = node;
      graph.setNodeAttribute(node, 'highlighted', true);
    };

    const onMouseMove = (e: MouseCoords) => {
      if (!draggedNode) return;
      // First ACTUAL move = a real drag begins (a plain click never reaches
      // here). Only now do we freeze the camera and wake the simulation — doing
      // this on plain clicks would fight the focus gather/zoom that follows a
      // click-to-select.
      if (!sigma.getCustomBBox()) {
        sigma.setCustomBBox(sigma.getBBox());
        wakeSimulation();
      }
      const pos = sigma.viewportToGraph(e);
      graph.setNodeAttribute(draggedNode, 'x', pos.x);
      graph.setNodeAttribute(draggedNode, 'y', pos.y);
      // Keep the camera still while dragging.
      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    };

    const endDrag = () => {
      // Release any frozen bbox so programmatic camera moves (focus zoom) work.
      if (sigma.getCustomBBox()) sigma.setCustomBBox(null);
      if (!draggedNode) return;
      graph.removeNodeAttribute(draggedNode, 'highlighted');
      draggedNode = null;

      if (useLayoutStore.getState().algorithm === 'force') {
        clearTimeout(stopTimer);
        stopTimer = window.setTimeout(() => {
          useGraphControlStore.getState().forceSupervisor?.stop();
        }, SETTLE_AFTER_DROP_MS);
      }
    };

    sigma.on('downNode', onDownNode);
    mouse.on('mousemovebody', onMouseMove);
    mouse.on('mouseup', endDrag);

    return () => {
      clearTimeout(stopTimer);
      sigma.off('downNode', onDownNode);
      mouse.off('mousemovebody', onMouseMove);
      mouse.off('mouseup', endDrag);
    };
  }, [sigma, graph]);
}
