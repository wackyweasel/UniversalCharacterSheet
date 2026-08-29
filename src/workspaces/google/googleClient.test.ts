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