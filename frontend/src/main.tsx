// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { App } from './App';
import { useUiStore } from './stores/uiStore';
import './index.css';

// ---------------------------------------------------------------------------
// React Query client
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ---------------------------------------------------------------------------
// Sync theme attribute on the document element
// ---------------------------------------------------------------------------

function applyTheme() {
  const theme = useUiStore.getState().theme;
  document.documentElement.setAttribute('data-theme', theme);
}

// Apply initial theme and subscribe to changes.
applyTheme();
useUiStore.subscribe((state, prevState) => {
  if (state.theme !== prevState.theme) {
    document.documentElement.setAttribute('data-theme', state.theme);
  }
});

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"> in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
