const INSTALLED_LAUNCH_PARAMETER = 'app';
const INSTALLED_LAUNCH_VALUE = 'installed';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as NavigatorWithStandalone).standalone === true;
}

export function hasInstalledLaunchMarker(location = window.location): boolean {
  return new URLSearchParams(location.search).get(INSTALLED_LAUNCH_PARAMETER) === INSTALLED_LAUNCH_VALUE;
}

export function isInstalledApp(): boolean {
  return isStandaloneDisplay();
}

export function getWebsiteUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

export function getInstalledDatabaseName(baseUrl = import.meta.env.BASE_URL): string {
  return `ucs-installed:${encodeURIComponent(baseUrl)}`;
}