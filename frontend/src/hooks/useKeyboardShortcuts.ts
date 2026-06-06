import { useEffect } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useUiStore } from '../stores/uiStore';
import type { LayoutAlgorithm } from '../stores/layoutStore';
import { useLayoutStore } from '../stores/layoutStore';

export function useKeyboardShortcuts() {
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const setAlgorithm = useLayoutStore((s) => s.setAlgorithm);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (isInput) {
          (target as HTMLInputElement).blur();
        }
        clearSelection();
        setSearchQuery('');
        return;
      }

      if (isInput) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          setSidebarTab('search');
          requestAnimationFrame(() => {
            const input = document.querySelector<HTMLInputElement>('input[placeholder="Search symbols..."]');
            input?.focus();
          });
          break;
        case 'b':
          toggleSidebar();
          break;
        case 't':
          toggleTheme();
          break;
        case '1':
          setAlgorithm('force' as LayoutAlgorithm);
          break;
        case '2':
          setAlgorithm('hierarchical' as LayoutAlgorithm);
          break;
        case '3':
          setAlgorithm('radial' as LayoutAlgorithm);
          break;
        case '4':
          setAlgorithm('tree' as LayoutAlgorithm);
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection, setSearchQuery, toggleSidebar, toggleTheme, setSidebarTab, setAlgorithm]);
}
