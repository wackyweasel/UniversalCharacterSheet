import { describe, expect, it } from 'vitest';
import { getInitiallyExpandedVersions } from './changelog';

const versions = ['1.17.1', '1.17.0', '1.16.0', '1.15.1', '1.9.0'];

describe('initially expanded changelog versions', () => {
  it('expands every version newer than the one last seen', () => {
    expect(getInitiallyExpandedVersions(versions, '1.16.0')).toEqual(['1.17.1', '1.17.0']);
    expect(getInitiallyExpandedVersions(versions, '1.15.2')).toEqual(['1.17.1', '1.17.0', '1.16.0']);
    expect(getInitiallyExpandedVersions(versions, '1.9.0')).toEqual(versions.slice(0, 4));
  });

  it('defaults to the latest version for manual opens or an unusable last-seen version', () => {
    for (const lastSeen of [undefined, null, 'invalid', '1.17.1', '2.0.0']) {
      expect(getInitiallyExpandedVersions(versions, lastSeen)).toEqual(['1.17.1']);
    }
    expect(getInitiallyExpandedVersions([], '1.0.0')).toEqual([]);
  });
});
