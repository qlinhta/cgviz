// ---------------------------------------------------------------------------
// AppShell — main layout container (Toolbar + Sidebar + Canvas + StatusBar)
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen flex-col bg-bg-primary text-text-primary overflow-hidden">
      {/* Top toolbar */}
      <Toolbar />

      {/* Middle: sidebar + main canvas */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Graph canvas slot */}
        <main className="relative flex-1 overflow-hidden bg-graph-bg graph-dots-bg">
          {children}
        </main>
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}
