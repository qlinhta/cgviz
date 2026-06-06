// ---------------------------------------------------------------------------
// useAmbientMotion — drives the subtle continuous "breathing" of the graph.
//
// When enabled, runs a rAF loop that advances the ambient clock and asks Sigma
// to re-render (skipping re-indexation for speed). The actual per-node offset
// is applied in the node reducer (see styles.ts), so this never mutates the
// underlying graph data — it's purely visual and layout-agnostic.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import type Sigma from 'sigma';

import { useLayoutStore } from '../stores/layoutStore';
import { ambient } from './ambient';

/** Radians advanced per second — small for a slow, calm drift. */
const SPEED = 0.6;

export function useAmbientMotion(sigma: Sigma | null): void {
  const enabled = useLayoutStore((s) => s.ambient);

  useEffect(() => {
    ambient.enabled = enabled;
    if (!sigma || !enabled) {
      // Trigger one refresh so nodes settle back to their true positions.
      sigma?.refresh({ skipIndexation: true });
      return;
    }

    let raf = 0;
    let last = performance.now();
    let sinceRefresh = 0;
    const FRAME_MS = 33; // throttle redraws to ~30fps to keep it light

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      ambient.clock += dt * SPEED;
      sinceRefresh += dt * 1000;
      if (sinceRefresh >= FRAME_MS) {
        sinceRefresh = 0;
        sigma.refresh({ skipIndexation: true });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [sigma, enabled]);
}
