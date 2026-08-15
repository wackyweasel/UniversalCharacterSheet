interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isInstalledApp(): boolean {
  const installedDisplayModes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
  return installedDisplayModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
    || (window.navigator as NavigatorWithStandalone).standalone === true
    || document.referrer.startsWith('android-app://');
}
