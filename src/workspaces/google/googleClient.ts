const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  callback: (response: TokenResponse) => void;
  requestAccessToken(options: { prompt: string }): void;
}

interface PickerDocument {
  id: string;
  name: string;
}

interface PickerResponse {
  action?: string;
  docs?: PickerDocument[];
}

interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setCallback(callback: (response: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GoogleLibraries {
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }): TokenClient;
    };
  };
  picker: {
    Action: { PICKED: string; CANCEL: string };
    DocsView: new () => {
      setIncludeFolders(includeFolders: boolean): unknown;
      setMimeTypes(mimeTypes: string): unknown;
    };
    PickerBuilder: new () => PickerBuilder;
  };
}

type GoogleWindow = Window & {
  google?: GoogleLibraries;
  gapi?: { load(name: string, callback: () => void): void };
};

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let tokenClient: TokenClient | null = null;
let librariesPromise: Promise<void> | null = null;
let tokenRequestPromise: Promise<string> | null = null;

function loadScript(id: string, source: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    script.id = id;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Google services could not be loaded.')), { once: true });
    if (!existing) {
      script.src = source;
      document.head.appendChild(script);
    }
  });
}

function getConfiguration() {
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '',
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY?.trim() ?? '',
    appId: import.meta.env.VITE_GOOGLE_APP_ID?.trim() ?? '',
  };
}

async function loadGoogleLibraries(): Promise<void> {
  if (librariesPromise) return librariesPromise;
  librariesPromise = Promise.all([
    loadScript('ucs-google-identity', GIS_SCRIPT_URL),
    loadScript('ucs-google-api', GAPI_SCRIPT_URL),
  ]).then(() => new Promise<void>((resolve, reject) => {
    const googleWindow = window as unknown as GoogleWindow;
    if (!googleWindow.gapi || !googleWindow.google) {
      reject(new Error('Google services did not initialize.'));
      return;
    }
    googleWindow.gapi.load('picker', resolve);
  }));
  return librariesPromise;
}

export function isGoogleDriveConfigured(): boolean {
  const configuration = getConfiguration();
  return Boolean(configuration.clientId && configuration.apiKey && configuration.appId);
}

export function getGoogleDriveAccessToken(): string | null {
  if (accessToken && Date.now() >= accessTokenExpiresAt) {
    accessToken = null;
    accessTokenExpiresAt = 0;
  }
  return accessToken;
}

export function clearGoogleDriveAccessToken(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;
}

async function requestGoogleDriveAccessToken(prompt: '' | 'none'): Promise<string> {
  const existingToken = getGoogleDriveAccessToken();
  if (existingToken) return existingToken;
  if (tokenRequestPromise) return tokenRequestPromise;

  tokenRequestPromise = (async () => {
    const configuration = getConfiguration();
    if (!isGoogleDriveConfigured()) throw new Error('Google Drive is not configured for this deployment.');
    await loadGoogleLibraries();
    const google = (window as unknown as GoogleWindow).google!;
    tokenClient ??= google.accounts.oauth2.initTokenClient({
      client_id: configuration.clientId,
      scope: DRIVE_SCOPE,
      callback: () => undefined,
    });

    return new Promise<string>((resolve, reject) => {
      tokenClient!.callback = (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google Drive authorization was cancelled.'));
          return;
        }
        accessToken = response.access_token;
        accessTokenExpiresAt = Date.now() + Math.max(0, (response.expires_in ?? 3600) - 60) * 1000;
        resolve(response.access_token);
      };
      tokenClient!.requestAccessToken({ prompt });
    });
  })();
  try {
    return await tokenRequestPromise;
  } finally {
    tokenRequestPromise = null;
  }
}

export async function restoreGoogleDriveAccessToken(): Promise<string | null> {
  try {
    return await requestGoogleDriveAccessToken('none');
  } catch {
    return null;
  }
}

export async function authorizeGoogleDrive(): Promise<string> {
  return requestGoogleDriveAccessToken('');
}

export async function pickGoogleDriveWorkspace(): Promise<PickerDocument | null> {
  const accessToken = await authorizeGoogleDrive();
  const configuration = getConfiguration();
  const google = (window as unknown as GoogleWindow).google!;

  return new Promise((resolve) => {
    const view = new google.picker.DocsView();
    view.setIncludeFolders(false);
    view.setMimeTypes('application/json');
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(configuration.apiKey)
      .setAppId(configuration.appId)
      .setCallback((response) => {
        if (response.action === google.picker.Action.PICKED) resolve(response.docs?.[0] ?? null);
        if (response.action === google.picker.Action.CANCEL) resolve(null);
      })
      .build();
    picker.setVisible(true);
  });
}