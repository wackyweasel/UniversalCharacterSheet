import { useSyncExternalStore } from 'react';
import { isInstalledApp } from './runtimeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstalledRelatedApp {
  platform: string;
}

interface NavigatorWithInstalledRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
}

export type InstallAvailability = 'installed' | 'prompt' | 'instructions' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installationRecorded = false;
let relatedAppDetectionRequest = 0;
const listeners = new Set<() => void>();

function recordInstallation(): void {
  installationRecorded = true;
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function isSafari(): boolean {
  const userAgent = navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(userAgent);
}

function supportsManualInstallation(): boolean {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isSafari() || isIOS || /Android/i.test(userAgent);
}

function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  emitChange();
}

function handleInstalled(): void {
  deferredPrompt = null;
  recordInstallation();
  emitChange();
}

async function detectInstalledRelatedApp(): Promise<void> {
  const getInstalledRelatedApps = (navigator as NavigatorWithInstalledRelatedApps).getInstalledRelatedApps;
  if (!getInstalledRelatedApps) return;
  const requestId = ++relatedAppDetectionRequest;

  try {
    const relatedApps = await getInstalledRelatedApps.call(navigator);
    if (requestId !== relatedAppDetectionRequest) return;

    if (relatedApps.some((app) => app.platform === 'webapp')) {
      if (!installationRecorded) {
        recordInstallation();
        emitChange();
      }
      return;
    }

    if (installationRecorded && !isInstalledApp()) {
      installationRecorded = false;
      emitChange();
    }
  } catch {
    // This optional API is unavailable in some browsers and contexts.
  }
}

function refreshInstalledRelatedApp(): void {
  if (document.visibilityState === 'hidden') return;
  void detectInstalledRelatedApp();
}

window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
window.addEventListener('appinstalled', handleInstalled);
window.addEventListener('pageshow', refreshInstalledRelatedApp);
window.addEventListener('focus', refreshInstalledRelatedApp);
document.addEventListener('visibilitychange', refreshInstalledRelatedApp);
void detectInstalledRelatedApp();

export function getInstallAvailability(): InstallAvailability {
  if (isInstalledApp() || installationRecorded) return 'installed';
  if (deferredPrompt) return 'prompt';
  if (supportsManualInstallation()) return 'instructions';
  return 'unavailable';
}

export function subscribeToInstallAvailability(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallAvailability(): InstallAvailability {
  return useSyncExternalStore(
    subscribeToInstallAvailability,
    getInstallAvailability,
    () => 'unavailable',
  );
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt;
  if (!prompt) return 'unavailable';

  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') {
    deferredPrompt = null;
    recordInstallation();
  }
  emitChange();
  return choice.outcome;
}