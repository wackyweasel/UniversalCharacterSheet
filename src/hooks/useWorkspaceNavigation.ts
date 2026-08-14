import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { appStorage } from '../persistence/appStorage';

const PLAY_LAYOUT_STORAGE_KEY = 'ucs:play-layout';
const LIST_COLUMNS_STORAGE_KEY = 'ucs:list-columns';
const SHEET_WORKSPACE_STORAGE_KEY = 'ucs:sheet-workspace';

export type SheetWorkspace = 'build' | 'play' | 'print';
export type PlayLayout = 'canvas' | 'list';

function getInitialPlayLayout(mode: string): PlayLayout {
  if (mode === 'vertical') return 'list';
  if (mode === 'play') return 'canvas';
  try {
    return appStorage.getItem(PLAY_LAYOUT_STORAGE_KEY) === 'list' ? 'list' : 'canvas';
  } catch {
    return 'canvas';
  }
}

function getInitialListColumns(): number {
  try {
    const storedValue = Number(appStorage.getItem(LIST_COLUMNS_STORAGE_KEY));
    return Number.isFinite(storedValue) ? Math.max(1, Math.floor(storedValue)) : 1;
  } catch {
    return 1;
  }
}

interface WorkspaceSettings {
  playLayout: PlayLayout;
  listColumns: number;
}

function workspaceKey(characterId?: string | null, sheetId?: string | null): string | null {
  return characterId && sheetId ? `${SHEET_WORKSPACE_STORAGE_KEY}:${characterId}:${sheetId}` : null;
}

function readWorkspaceSettings(mode: string, characterId?: string | null, sheetId?: string | null): WorkspaceSettings {
  const key = workspaceKey(characterId, sheetId);
  if (key) {
    try {
      const parsed = JSON.parse(appStorage.getItem(key) || 'null');
      if (parsed && (parsed.playLayout === 'canvas' || parsed.playLayout === 'list')) {
        const listColumns = Number(parsed.listColumns);
        return {
          playLayout: parsed.playLayout,
          listColumns: Number.isFinite(listColumns) ? Math.max(1, Math.floor(listColumns)) : 1,
        };
      }
    } catch {
      // Fall back to the legacy shared preference when storage is unavailable or malformed.
    }
  }

  return {
    playLayout: getInitialPlayLayout(mode),
    listColumns: getInitialListColumns(),
  };
}

function persistWorkspaceSettings(settings: WorkspaceSettings, characterId?: string | null, sheetId?: string | null): void {
  try {
    const key = workspaceKey(characterId, sheetId);
    if (key) {
      appStorage.setItem(key, JSON.stringify(settings));
      return;
    }
    appStorage.setItem(PLAY_LAYOUT_STORAGE_KEY, settings.playLayout);
    appStorage.setItem(LIST_COLUMNS_STORAGE_KEY, String(settings.listColumns));
  } catch {
    // A view preference should never block the sheet when storage is unavailable.
  }
}

/**
 * User-facing navigation for the sheet. The persisted store still uses the
 * legacy mode values internally so existing characters and print behavior stay
 * compatible while the interface speaks in Build/Play terms.
 */
export function useWorkspaceNavigation(characterId?: string | null, sheetId?: string | null) {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const [playLayout, setPlayLayoutState] = useState<PlayLayout>(() => readWorkspaceSettings(mode, characterId, sheetId).playLayout);
  const [listColumns, setListColumnsState] = useState(() => readWorkspaceSettings(mode, characterId, sheetId).listColumns);
  const activeWorkspaceKey = workspaceKey(characterId, sheetId);
  const previousWorkspaceKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (previousWorkspaceKeyRef.current === activeWorkspaceKey) return;
    previousWorkspaceKeyRef.current = activeWorkspaceKey;

    const settings = readWorkspaceSettings(mode, characterId, sheetId);
    setPlayLayoutState(settings.playLayout);
    setListColumnsState(settings.listColumns);
    persistWorkspaceSettings(settings, characterId, sheetId);
    if (mode !== 'edit' && mode !== 'print') {
      setMode(settings.playLayout === 'list' ? 'vertical' : 'play');
    }
  }, [activeWorkspaceKey, characterId, mode, setMode, sheetId]);

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
    persistWorkspaceSettings({ playLayout: layout, listColumns }, characterId, sheetId);
  }, [characterId, listColumns, sheetId]);

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
    persistWorkspaceSettings({ playLayout, listColumns: nextColumns }, characterId, sheetId);
  }, [characterId, playLayout, sheetId]);

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
