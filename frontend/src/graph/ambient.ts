// ---------------------------------------------------------------------------
// Shared mutable state for the ambient "breathing" motion.
//
// The value is read inside the (hot) Sigma node reducer, so it lives in a
// plain module object rather than React state to avoid re-renders/allocations.
// useAmbientMotion drives `clock`; the node reducer offsets each node by a
// small per-node sinusoid of `clock`.
// ---------------------------------------------------------------------------

export const ambient = {
  /** Whether breathing is currently active. */
  enabled: true,
  /** Ever-increasing time value (radians) advanced by the rAF loop. */
  clock: 0,
  /** Oscillation amplitude in graph-space units. */
  amplitude: 16,
};
