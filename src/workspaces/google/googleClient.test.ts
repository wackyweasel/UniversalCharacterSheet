import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TokenCallback = (response: { access_token?: string; expires_in?: number; error?: string }) => void;

function installGoogleLibraries(responses: Array<{ access_token?: string; expires_in?: number; error?: string } | null>) {
  const prompts: string[] = [];
  const tokenClient = {
    callback: (() => undefined) as TokenCallback,
    requestAccessToken: ({ prompt }: { prompt: string }) => {
      prompts.push(prompt);
      const response = responses.shift();
      if (response === undefined) throw new Error('Missing token response.');
      if (response === null) return;
      queueMicrotask(() => tokenClient.callback(response));
    },
  };
  const loadedScript = { dataset: { loaded: 'true' } };

  vi.stubGlobal('document', {
    getElementById: () => loadedScript,
  });
  vi.stubGlobal('window', {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: () => tokenClient,
        },
      },
    },
    gapi: {
      load: (_name: string, callback: () => void) => callback(),
    },
  });

  return prompts;
}

function installSessionStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  return values;
}

describe('Google Drive authorization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id');
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'api-key');
    vi.stubEnv('VITE_GOOGLE_APP_ID', 'app-id');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('silently restores a previous grant and reuses the live token', async () => {
    const prompts = installGoogleLibraries([{ access_token: 'restored-token', expires_in: 3600 }]);
    const { authorizeGoogleDrive, restoreGoogleDriveAccessToken } = await import('./googleClient');

    await expect(restoreGoogleDriveAccessToken()).resolves.toBe('restored-token');
    await expect(authorizeGoogleDrive()).resolves.toBe('restored-token');

    expect(prompts).toEqual(['none']);
  });

  it('restores a live token from session storage after a page reload', async () => {
    installSessionStorage();
    const prompts = installGoogleLibraries([{ access_token: 'session-token', expires_in: 3600 }]);
    const firstPage = await import('./googleClient');

    await expect(firstPage.authorizeGoogleDrive()).resolves.toBe('session-token');
    vi.resetModules();

    const reloadedPage = await import('./googleClient');
    expect(reloadedPage.getGoogleDriveAccessToken()).toBe('session-token');
    await expect(reloadedPage.restoreGoogleDriveAccessToken()).resolves.toBe('session-token');
    expect(prompts).toEqual(['']);
  });

  it('discards an expired session token before restoring authorization', async () => {
    const sessionValues = installSessionStorage();
    sessionValues.set('ucs:google-drive-session-token', JSON.stringify({
      token: 'expired-token',
      expiresAt: Date.now() - 1,
    }));
    const prompts = installGoogleLibraries([{ access_token: 'restored-token', expires_in: 3600 }]);
    const { restoreGoogleDriveAccessToken } = await import('./googleClient');

    await expect(restoreGoogleDriveAccessToken()).resolves.toBe('restored-token');
    expect(prompts).toEqual(['none']);
    expect(sessionValues.get('ucs:google-drive-session-token')).toContain('restored-token');
  });

  it('falls back to interactive authorization after silent restoration is unavailable', async () => {
    const prompts = installGoogleLibraries([
      { error: 'interaction_required' },
      { access_token: 'interactive-token', expires_in: 3600 },
    ]);
    const { authorizeGoogleDrive, restoreGoogleDriveAccessToken } = await import('./googleClient');

    await expect(restoreGoogleDriveAccessToken()).resolves.toBeNull();
    await expect(authorizeGoogleDrive()).resolves.toBe('interactive-token');

    expect(prompts).toEqual(['none', '']);
  });

  it('stops waiting when silent authorization does not respond', async () => {
    vi.useFakeTimers();
    const prompts = installGoogleLibraries([null]);
    const { restoreGoogleDriveAccessToken } = await import('./googleClient');

    const restoration = restoreGoogleDriveAccessToken();
    await vi.advanceTimersByTimeAsync(5000);

    await expect(restoration).resolves.toBeNull();
    expect(prompts).toEqual(['none']);
  });
});