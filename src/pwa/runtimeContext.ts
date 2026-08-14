interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isInstalledApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as NavigatorWithStandalone).standalone === true;
}
