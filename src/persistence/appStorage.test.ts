import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_THEMES_STORAGE_KEY } from './storageKeys';

class TestStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const websiteStorage = new TestStorage();
let standalone = false;

beforeAll(() => {
  const navigatorValue = { standalone: false };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: websiteStorage,
      location: { search: '', origin: 'https://example.test' },
      navigator: navigatorValue,
      matchMedia: () => ({ matches: standalone }),
      addEventListener: () => undefined,
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      visibilityState: 'visible',
      addEventListener: () => undefined,
    },
  });
});

beforeEach(() => {
  websiteStorage.clear();
  standalone = false;
  window.location.search = '';
  vi.resetModules();
});

describe('app storage modes', () => {
  it('keeps website mode as an exact localStorage pass-through', async () => {
    const { appStorage, initializeAppStorage } = await import('./appStorage');
    const result = await initializeAppStorage();
    const serialized = '{"characters":[{"id":"web"}]}';

    appStorage.setItem('ucs:store', serialized);

    expect(result.mode).toBe('website');
    expect(websiteStorage.getItem('ucs:store')).toBe(serialized);
  });

  it('copies once on Chrome install launch and permanently dismisses the workspace notice', async () => {
    websiteStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'web-1' }] }));
    const websiteThemes = JSON.stringify([{ id: 'theme-1', name: 'Transferred Theme' }]);
    websiteStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, websiteThemes);
    websiteStorage.setItem('ucs:templates', JSON.stringify({ templates: [{ id: 'template-1' }] }));
    websiteStorage.setItem('ucs:userPresets', JSON.stringify({ userPresets: [] }));
    websiteStorage.setItem('ucs:timeline', '{"eventsByCharacter":{}}');
    websiteStorage.setItem('ucs:telemetry', '{"lastSent":{}}');
    websiteStorage.setItem('ucs:gallery-cache:v2', '{"manifest":{}}');
    const originalWebsiteStore = websiteStorage.getItem('ucs:store');

    window.location.search = '?app=installed';
    const {
      appStorage,
      initializeAppStorage,
    } = await import('./appStorage');

    const firstLaunch = await initializeAppStorage();
    expect(firstLaunch.mode).toBe('installed');
    expect(firstLaunch.showWorkspaceNotice).toBe(true);
    expect(firstLaunch.migrationSummary).toMatchObject({
      characterCount: 1,
      templateCount: 1,
      userPresetCount: 0,
    });
    expect(appStorage.getItem('ucs:timeline')).toBe('{"eventsByCharacter":{}}');
    expect(appStorage.getItem(CUSTOM_THEMES_STORAGE_KEY)).toBe(websiteThemes);
    expect(appStorage.getItem('ucs:telemetry')).toBeNull();
    expect(appStorage.getItem('ucs:gallery-cache:v2')).toBeNull();

    standalone = true;
    window.location.search = '';
    vi.resetModules();
    const shortcutLaunchStorage = await import('./appStorage');
    const shortcutLaunch = await shortcutLaunchStorage.initializeAppStorage();
    expect(shortcutLaunch.migrationSummary).toMatchObject({ characterCount: 1 });
    expect(shortcutLaunch.showWorkspaceNotice).toBe(true);

    await shortcutLaunchStorage.dismissInstalledWorkspaceNotice();
    vi.resetModules();
    const dismissedStorage = await import('./appStorage');
    const dismissedLaunch = await dismissedStorage.initializeAppStorage();
    expect(dismissedLaunch.showWorkspaceNotice).toBe(false);

    dismissedStorage.appStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'installed-only' }] }));
    dismissedStorage.appStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify([{ id: 'installed-theme' }]));
    await dismissedStorage.flushAppStorage();
    expect(websiteStorage.getItem('ucs:store')).toBe(originalWebsiteStore);
    expect(websiteStorage.getItem(CUSTOM_THEMES_STORAGE_KEY)).toBe(websiteThemes);

    websiteStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'web-1' }, { id: 'web-2' }] }));
    const replacement = await dismissedStorage.replaceInstalledWorkspaceFromWebsite();
    expect(replacement.characterCount).toBe(2);
    expect(JSON.parse(dismissedStorage.appStorage.getItem('ucs:store') ?? '{}').characters).toHaveLength(2);
    expect(JSON.parse(websiteStorage.getItem('ucs:store') ?? '{}').characters).toHaveLength(2);
  });
});