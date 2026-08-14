import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('copies once on a markerless standalone launch, excludes disposable keys, and replaces without changing the website', async () => {
    websiteStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'web-1' }] }));
    websiteStorage.setItem('ucs:templates', JSON.stringify({ templates: [{ id: 'template-1' }] }));
    websiteStorage.setItem('ucs:userPresets', JSON.stringify({ userPresets: [] }));
    websiteStorage.setItem('ucs:timeline', '{"eventsByCharacter":{}}');
    websiteStorage.setItem('ucs:telemetry', '{"lastSent":{}}');
    websiteStorage.setItem('ucs:gallery-cache:v2', '{"manifest":{}}');
    const originalWebsiteStore = websiteStorage.getItem('ucs:store');

    standalone = true;
    const {
      appStorage,
      flushAppStorage,
      initializeAppStorage,
      replaceInstalledWorkspaceFromWebsite,
    } = await import('./appStorage');

    const firstLaunch = await initializeAppStorage();
    expect(firstLaunch.mode).toBe('installed');
    expect(firstLaunch.firstMigration).toMatchObject({
      characterCount: 1,
      templateCount: 1,
      userPresetCount: 0,
    });
    expect(appStorage.getItem('ucs:timeline')).toBe('{"eventsByCharacter":{}}');
    expect(appStorage.getItem('ucs:telemetry')).toBeNull();
    expect(appStorage.getItem('ucs:gallery-cache:v2')).toBeNull();

    appStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'installed-only' }] }));
    await flushAppStorage();
    expect(websiteStorage.getItem('ucs:store')).toBe(originalWebsiteStore);

    websiteStorage.setItem('ucs:store', JSON.stringify({ characters: [{ id: 'web-1' }, { id: 'web-2' }] }));
    const replacement = await replaceInstalledWorkspaceFromWebsite();
    expect(replacement.characterCount).toBe(2);
    expect(JSON.parse(appStorage.getItem('ucs:store') ?? '{}').characters).toHaveLength(2);
    expect(JSON.parse(websiteStorage.getItem('ucs:store') ?? '{}').characters).toHaveLength(2);

    vi.resetModules();
    const reloadedStorage = await import('./appStorage');
    const secondLaunch = await reloadedStorage.initializeAppStorage();
    expect(secondLaunch.firstMigration).toBeNull();
    expect(JSON.parse(reloadedStorage.appStorage.getItem('ucs:store') ?? '{}').characters).toHaveLength(2);
  });
});