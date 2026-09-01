export function supportsStorageWorkspaces(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && typeof indexedDB !== 'undefined';
}

export function supportsDirectoryWorkspaces(): boolean {
  return supportsStorageWorkspaces() && 'showDirectoryPicker' in window;
}