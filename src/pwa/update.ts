import { registerSW } from 'virtual:pwa-register';
import { useSyncExternalStore } from 'react';
import { isInstalledApp } from './runtimeContext';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

let updateServiceWorker: UpdateServiceWorker | null = null;
let updateAvailable = false;
const updateListeners = new Set<() => void>();

function emitUpdateChange(): void {
  updateListeners.forEach((listener) => listener());
}

export function prepareServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const installedAtLaunch = isInstalledApp();

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      updateAvailable = true;
      emitUpdateChange();
      void applyAvailableUpdate();
    },
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      if (installedAtLaunch && navigator.serviceWorker.controller) {
        void registration?.update().catch((error) => {
          console.warn('Could not check for an installed app update', error);
        });
      }
    },
    onRegisterError: (error) => {
      console.warn('Could not register the app service worker', error);
    },
  });
}

export function subscribeToUpdateAvailability(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

export function getUpdateAvailability(): boolean {
  return updateAvailable;
}

export function useUpdateAvailability(): boolean {
  return useSyncExternalStore(
    subscribeToUpdateAvailability,
    getUpdateAvailability,
    () => false,
  );
}

export function dismissAvailableUpdate(): void {
  updateAvailable = false;
  emitUpdateChange();
}

export async function applyAvailableUpdate(): Promise<void> {
  const applyUpdate = updateServiceWorker;
  if (!applyUpdate) return;

  updateAvailable = false;
  emitUpdateChange();

  try {
    await applyUpdate(true);
  } catch (error) {
    updateAvailable = true;
    emitUpdateChange();
    console.warn('Could not apply the app update', error);
  }
}