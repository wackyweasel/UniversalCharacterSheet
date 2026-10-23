import type { AutoStackPlacement } from '../utils/autoStackPlan';

interface Props {
  placements: AutoStackPlacement[];
  width: number;
  height: number;
  labels: ReadonlyMap<string, string>;
  selectedBlockId: string | null;
  // Blocks whose size the layout cannot change.
  fixedBlockIds: ReadonlySet<string>;
  onSelect: (blockId: string) => void;
}

const fill = (percent: number) => `color-mix(in srgb, var(--color-accent) ${percent}%, var(--color-paper))`;

// Miniature of the stacked layout; every box is a widget.
export default function AutoStackPreview({ placements, width, height, labels, selectedBlockId, fixedBlockIds, onSelect }: Props) {
  const fontSize = Math.max(width, height) / 30;
  return (
    <svg
      role="img"
      aria-label="Preview of the stacked layout"
      viewBox={`-4 -4 ${width + 8} ${height + 8}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      <rect x={0} y={0} width={width} height={height} fill="none" stroke="var(--color-border)" strokeDasharray={`${fontSize / 2} ${fontSize / 2}`} strokeWidth={fontSize / 8} />
      {placements.map((placement) => {
        const selected = placement.blockId === selectedBlockId;
        const fixed = fixedBlockIds.has(placement.blockId);
        const label = labels.get(placement.id) ?? '';
        return (
          <svg
            key={placement.id}
            x={placement.x}
            y={placement.y}
            width={placement.w}
            height={placement.h}
            className="cursor-pointer"
            onClick={() => onSelect(placement.blockId)}
          >
            <title>{label}</title>
            <rect
              x={fontSize / 16}
              y={fontSize / 16}
              width={Math.max(0, placement.w - fontSize / 8)}
              height={Math.max(0, placement.h - fontSize / 8)}
              rx={fontSize / 6}
              fill={fill(selected ? 55 : fixed ? 8 : 22)}
              stroke={selected ? 'var(--color-ink)' : 'var(--color-accent)'}
              strokeWidth={selected ? fontSize / 5 : fontSize / 12}
            />
            <text x={fontSize / 2} y={fontSize * 1.4} fontSize={fontSize} fill="var(--color-ink)" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          </svg>
        );
      })}
    </svg>
  );
}
