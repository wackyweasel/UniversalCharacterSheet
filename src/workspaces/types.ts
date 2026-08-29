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
  locationName?: string;
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

export interface WorkspaceData {
  characters: Character[];
  eventsByCharacter: Record<string, WorkspaceCharacterTimeline>;
  customThemes: CustomTheme[];
  templates: AnyTemplate[];
  userPresets: UserPreset[];
}

export interface RestorableWorkspaceData {
  characters: Character[];
  eventsByCharacter?: Record<string, WorkspaceCharacterTimeline>;
  customThemes?: CustomTheme[];
  templates?: AnyTemplate[];
  userPresets?: UserPreset[];
  activeCharacterId?: string | null;
  mode?: WorkspaceMode;
}

export interface WorkspaceDocument extends WorkspaceData {
  format: 'universal-character-sheet/workspace';
  version: 1;
  workspaceId: string;
  name: string;
  revision: number;
  updatedAt: string;
  activeCharacterId: string | null;
  mode: WorkspaceMode;
}