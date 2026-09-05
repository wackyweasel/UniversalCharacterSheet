export function getClockSegments(segments: number): number {
  return Number.isFinite(segments) ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER - 1, Math.floor(segments))) : 1;
}

export function getClockValue(value: number, segments: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(getClockSegments(segments), Math.floor(value))) : 0;
}

export function getClockSeparatorPath(segments: number): string | null {
  const count = getClockSegments(segments);
  if (count === 1) return '';
  const maxClockDiameter = 240;
  const separatorWidth = 2;
  if (count >= Math.ceil(Math.PI * maxClockDiameter / separatorWidth)) return null;
  return Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count;
    const endX = 50 + 50 * Math.sin(angle);
    const endY = 50 - 50 * Math.cos(angle);
    return `M 50 50 L ${endX.toFixed(6)} ${endY.toFixed(6)}`;
  }).join(' ');
}

export function advanceClock(value: number, change: number, segments: number): number {
  const states = getClockSegments(segments) + 1;
  const nextValue = getClockValue(value, segments) + Math.trunc(change);
  return ((nextValue % states) + states) % states;
}

export function getClockDragValue(value: number, segments: number, deltaX: number, deltaY: number, diameter: number): number {
  const distance = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : -deltaY;
  const pixelsPerSegment = Math.max(6, Math.min(24, diameter / Math.max(4, getClockSegments(segments))));
  return advanceClock(value, Math.trunc(distance / pixelsPerSegment), segments);
}