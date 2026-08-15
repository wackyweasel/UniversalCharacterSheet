import { registerSW } from 'virtual:pwa-register';
import { isInstalledApp } from './runtimeContext';

export function prepareServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  let startupWindowOpen = true;
  const installedAtLaunch = isInstalledApp();
  window.setTimeout(() => { startupWindowOpen = false; }, 3000);

  const applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      if (installedAtLaunch && startupWindowOpen) void applyUpdate(true);
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