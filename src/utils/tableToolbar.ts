export interface TableBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export function placeTableToolbar(rects: TableBounds[], width: number, height: number,
  viewportWidth: number, viewportHeight: number, preferred: { x: number; y: number }): { x: number; y: number } {
  // Adjacent selected cells share an exclusion area; coalescing avoids a candidate per cell.
  rects = rects.slice().sort((a, b) => a.top - b.top || a.bottom - b.bottom || a.left - b.left)
    .reduce<TableBounds[]>((result, rect) => {
      const last = result[result.length - 1];
      if (last && last.top === rect.top && last.bottom === rect.bottom && rect.left <= last.right + 0.5) {
        last.right = Math.max(last.right, rect.right);
        last.width = last.right - last.left;
      } else result.push({ ...rect });
      return result;
    }, []).sort((a, b) => a.left - b.left || a.right - b.right || a.top - b.top)
    .reduce<TableBounds[]>((result, rect) => {
      const last = result[result.length - 1];
      if (last && last.left === rect.left && last.right === rect.right && rect.top <= last.bottom + 0.5) {
        last.bottom = Math.max(last.bottom, rect.bottom);
        last.height = last.bottom - last.top;
      } else result.push({ ...rect });
      return result;
    }, []);
  const gap = 8;
  const clampX = (x: number) => Math.max(gap, Math.min(x, viewportWidth - width - gap));
  const clampY = (y: number) => Math.max(gap, Math.min(y, viewportHeight - height - gap));
  const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
  const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
  const centerX = (left + right - width) / 2, centerY = (top + bottom - height) / 2;
  const candidates = rects.length ? [
    { x: centerX, y: top - height - gap }, { x: centerX, y: bottom + gap },
    { x: right + gap, y: centerY }, { x: left - width - gap, y: centerY },
    ...Array.from(new Set([gap, viewportWidth - width - gap, ...rects.flatMap(r => [r.left - width - gap, r.right + gap])]))
      .flatMap(x => Array.from(new Set([gap, viewportHeight - height - gap, ...rects.flatMap(r => [r.top - height - gap, r.bottom + gap])]))
        .map(y => ({ x, y }))),
  ] : [preferred];
  const overlap = (x: number, y: number) => rects.reduce((sum, r) =>
    sum + Math.max(0, Math.min(x + width, r.right + gap) - Math.max(x, r.left - gap)) *
      Math.max(0, Math.min(y + height, r.bottom + gap) - Math.max(y, r.top - gap)), 0);
  let best = { x: clampX(preferred.x), y: clampY(preferred.y) };
  let bestOverlap = Infinity;
  for (const candidate of candidates) {
    const point = { x: clampX(candidate.x), y: clampY(candidate.y) };
    const area = overlap(point.x, point.y);
    if (area < bestOverlap) { best = point; bestOverlap = area; }
    if (!area) break;
  }
  return best;
}
