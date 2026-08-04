import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const PLAY_LAYOUT_STORAGE_KEY = 'ucs:play-layout';
const LIST_COLUMNS_STORAGE_KEY = 'ucs:list-columns';

export type SheetWorkspace = 'build' | 'play' | 'print';
export type PlayLayout = 'canvas' | 'list';

function getInitialPlayLayout(mode: string): PlayLayout {
  if (mode === 'vertical') return 'list';
  if (mode === 'play') return 'canvas';
  try {
    return localStorage.getItem(PLAY_LAYOUT_STORAGE_KEY) === 'list' ? 'list' : 'canvas';
  } catch {
    return 'canvas';
  }
}

function getInitialListColumns(): number {
  try {
    const storedValue = Number(localStorage.getItem(LIST_COLUMNS_STORAGE_KEY));
    return Number.isFinite(storedValue) ? Math.max(1, Math.floor(storedValue)) : 1;
  } catch {
    return 1;
  }
}

/**
 * User-facing navigation for the sheet. The persisted store still uses the
 * legacy mode values internally so existing characters and print behavior stay
 * compatible while the interface speaks in Build/Play terms.
 */
export function useWorkspaceNavigation() {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const [playLayout, setPlayLayoutState] = useState<PlayLayout>(() => getInitialPlayLayout(mode));
  const [listColumns, setListColumnsState] = useState(getInitialListColumns);

  useEffect(() => {
    if (mode === 'vertical') {
      setPlayLayoutState('list');
    } else if (mode === 'play') {
      setPlayLayoutState('canvas');
    }
  }, [mode]);

  const workspace: SheetWorkspace = mode === 'edit' ? 'build' : mode === 'print' ? 'print' : 'play';

  const persistPlayLayout = useCallback((layout: PlayLayout) => {
    setPlayLayoutState(layout);
    try {
      localStorage.setItem(PLAY_LAYOUT_STORAGE_KEY, layout);
    } catch {
      // A view preference should never block the sheet when storage is unavailable.
    }
  }, []);

  const enterBuild = useCallback(() => {
    setMode('edit');
  }, [setMode]);

  const enterPlay = useCallback(() => {
    setMode(playLayout === 'list' ? 'vertical' : 'play');
  }, [playLayout, setMode]);

  const setPlayLayout = useCallback((layout: PlayLayout) => {
    persistPlayLayout(layout);
    if (mode !== 'edit' && mode !== 'print') {
      setMode(layout === 'list' ? 'vertical' : 'play');
    }
  }, [mode, persistPlayLayout, setMode]);

  const setListColumns = useCallback((columns: number) => {
    const nextColumns = Math.max(1, Math.floor(columns));
    setListColumnsState(nextColumns);
    try {
      localStorage.setItem(LIST_COLUMNS_STORAGE_KEY, String(nextColumns));
    } catch {
      // A view preference should never block the sheet when storage is unavailable.
    }
  }, []);

  return {
    workspace,
    playLayout,
    listColumns,
    enterBuild,
    enterPlay,
    setPlayLayout,
    setListColumns,
  };
}
