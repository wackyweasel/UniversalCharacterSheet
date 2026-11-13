export function getInitiallyExpandedVersions(versions: readonly string[], lastSeenVersion?: string | null): string[] {
  const latest = versions[0];
  if (!latest) return [];

  const parseVersion = (version: string) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
    return version.split('.').map(Number);
  };
  const lastSeen = lastSeenVersion ? parseVersion(lastSeenVersion) : null;
  if (!lastSeen) return [latest];

  const unseen = versions.filter((version) => {
    const parts = parseVersion(version);
    if (!parts) return false;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== lastSeen[i]) return parts[i] > lastSeen[i];
    }
    return false;
  });
  return unseen.length > 0 ? unseen : [latest];
}
