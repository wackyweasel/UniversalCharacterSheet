import type { Character } from '../types';
import type { CustomTheme } from '../store/useCustomThemeStore';
import type { AnyTemplate } from '../store/useTemplateStore';
import type { UserPreset } from '../store/useUserPresetStore';

export type StorageWorkspaceProvider = 'browser' | 'directory' | 'google-drive';
export type WorkspaceMode = 'play' | 'edit' | 'vertical' | 'print';

export interface StorageWorkspace {
  id: string;
  name: string;
  provider: StorageWorkspaceProvider;
  createdAt: string;
  lastOpenedAt: string;
  driveFileId?: string;
}

export interface WorkspaceTimelineEvent {
  id: string;
  timestamp: number;
  widgetLabel: string;
  widgetType: string;
  description: string;
  icon: string;
}

export interface WorkspaceCharacterTimeline {
  events: WorkspaceTimelineEvent[];
  nextId: number;
}

export interface WorkspaceDocument {
  format: 'universal-character-sheet/workspace';
  version: 1;
  workspaceId: string;
  name: string;
  revision: number;
  updatedAt: string;
  characters: Character[];
  eventsByCharacter: Record<string, WorkspaceCharacterTimeline>;
  activeCharacterId: string | null;
  mode: WorkspaceMode;
  customThemes?: CustomTheme[];
  templates?: AnyTemplate[];
  userPresets?: UserPreset[];
}