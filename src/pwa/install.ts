import { useSyncExternalStore } from 'react';
import { isInstalledApp } from './runtimeContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallAvailability = 'installed' | 'prompt' | 'instructions' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

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
  emitChange();
}

window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
window.addEventListener('appinstalled', handleInstalled);

export function getInstallAvailability(): InstallAvailability {
  if (isInstalledApp()) return 'installed';
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
  if (choice.outcome === 'accepted') deferredPrompt = null;
  emitChange();
  return choice.outcome;
}