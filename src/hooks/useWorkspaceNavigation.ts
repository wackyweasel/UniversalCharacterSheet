import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const PLAY_LAYOUT_STORAGE_KEY = 'ucs:play-layout';

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

/**
 * User-facing navigation for the sheet. The persisted store still uses the
 * legacy mode values internally so existing characters and print behavior stay
 * compatible while the interface speaks in Build/Play terms.
 */
export function useWorkspaceNavigation() {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const [playLayout, setPlayLayoutState] = useState<PlayLayout>(() => getInitialPlayLayout(mode));

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
    if (mode !== 'print') {
      setMode(layout === 'list' ? 'vertical' : 'play');
    }
  }, [mode, persistPlayLayout, setMode]);

  return {
    workspace,
    playLayout,
    enterBuild,
    enterPlay,
    setPlayLayout,
  };
}
