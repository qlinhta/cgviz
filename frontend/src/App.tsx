// ---------------------------------------------------------------------------
// Root application component
// ---------------------------------------------------------------------------

import { AppShell } from './components/layout/AppShell';
import { GraphCanvas } from './graph/GraphCanvas';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
  useKeyboardShortcuts();
  return (
    <AppShell>
      <GraphCanvas />
    </AppShell>
  );
}
