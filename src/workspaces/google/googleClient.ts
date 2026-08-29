const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';
const SILENT_TOKEN_TIMEOUT_MS = 5000;

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
let identityLibraryPromise: Promise<void> | null = null;
let pickerLibraryPromise: Promise<void> | null = null;
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

async function loadGoogleIdentityLibrary(): Promise<void> {
  if (identityLibraryPromise) return identityLibraryPromise;
  identityLibraryPromise = loadScript('ucs-google-identity', GIS_SCRIPT_URL).then(() => {
    const googleWindow = window as unknown as GoogleWindow;
    if (!googleWindow.google) throw new Error('Google Identity Services did not initialize.');
  });
  return identityLibraryPromise;
}

async function loadGooglePickerLibrary(): Promise<void> {
  if (pickerLibraryPromise) return pickerLibraryPromise;
  pickerLibraryPromise = Promise.all([
    loadGoogleIdentityLibrary(),
    loadScript('ucs-google-api', GAPI_SCRIPT_URL),
  ]).then(() => new Promise<void>((resolve, reject) => {
    const googleWindow = window as unknown as GoogleWindow;
    if (!googleWindow.gapi) {
      reject(new Error('Google Picker did not initialize.'));
      return;
    }
    googleWindow.gapi.load('picker', resolve);
  }));
  return pickerLibraryPromise;
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

async function requestGoogleDriveAccessToken(prompt: '' | 'none', timeoutMs?: number): Promise<string> {
  const existingToken = getGoogleDriveAccessToken();
  if (existingToken) return existingToken;
  if (tokenRequestPromise) return tokenRequestPromise;

  const request = (async () => {
    const configuration = getConfiguration();
    if (!isGoogleDriveConfigured()) throw new Error('Google Drive is not configured for this deployment.');
    await loadGoogleIdentityLibrary();
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
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  tokenRequestPromise = timeoutMs === undefined
    ? request
    : Promise.race([
      request,
      new Promise<string>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Google Drive session restoration timed out.')), timeoutMs);
      }),
    ]);
  try {
    return await tokenRequestPromise;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
    tokenRequestPromise = null;
  }
}

export async function restoreGoogleDriveAccessToken(): Promise<string | null> {
  try {
    return await requestGoogleDriveAccessToken('none', SILENT_TOKEN_TIMEOUT_MS);
  } catch {
    return null;
  }
}

export async function authorizeGoogleDrive(): Promise<string> {
  return requestGoogleDriveAccessToken('');
}

export async function pickGoogleDriveWorkspace(): Promise<PickerDocument | null> {
  const accessToken = await authorizeGoogleDrive();
  await loadGooglePickerLibrary();
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