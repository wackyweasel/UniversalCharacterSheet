import { registerSW } from 'virtual:pwa-register';
import { isInstalledApp } from './runtimeContext';

const UPDATE_GATE_MS = 2000;
const UPDATE_RELOAD_FALLBACK_MS = 5000;

function waitForInstallingWorker(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.installing;
  if (!worker) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, UPDATE_GATE_MS);
    const handleStateChange = () => {
      if (worker.state !== 'installed' && worker.state !== 'redundant') return;
      window.clearTimeout(timeout);
      worker.removeEventListener('statechange', handleStateChange);
      resolve();
    };
    worker.addEventListener('statechange', handleStateChange);
  });
}

export function prepareServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return Promise.resolve();

  const installedAtLaunch = isInstalledApp();
  let launchGateOpen = true;
  let applyingUpdate = false;
  let resolveGate: () => void = () => undefined;

  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve;
  });

  const finishGate = () => {
    if (!launchGateOpen || applyingUpdate) return;
    launchGateOpen = false;
    resolveGate();
  };

  let applyUpdate: (reloadPage?: boolean) => Promise<void> = async () => undefined;

  const applyLaunchUpdate = () => {
    if (!installedAtLaunch || !launchGateOpen || applyingUpdate) return;
    applyingUpdate = true;
    void applyUpdate(true);
    window.setTimeout(() => window.location.reload(), UPDATE_RELOAD_FALLBACK_MS);
  };

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      applyLaunchUpdate();
    },
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      if (!registration || !installedAtLaunch || !navigator.serviceWorker.controller) {
        finishGate();
        return;
      }

      void (async () => {
        try {
          await registration.update();
          await waitForInstallingWorker(registration);
          if (registration.waiting && launchGateOpen) {
            applyLaunchUpdate();
            return;
          }
        } catch (error) {
          console.warn('Could not check for an installed app update', error);
        }
        finishGate();
      })();
    },
    onRegisterError: (error) => {
      console.warn('Could not register the app service worker', error);
      finishGate();
    },
  });

  window.setTimeout(finishGate, UPDATE_GATE_MS);
  return gate;
}