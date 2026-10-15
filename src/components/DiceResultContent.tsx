import { useEffect, useState } from 'react';
import type { DiceResultDieState, DiceResultKind, DiceResultOutput, DiceShape } from '../utils/diceResult';
import { getDiceShape } from '../utils/diceResult';

const DIE_STATE_CLASS: Record<DiceResultDieState, string> = {
  plain: '',
  hit: 'dice-result__die--hit',
  best: 'dice-result__die--best',
  cancel: 'dice-result__die--cancel',
  dropped: 'dice-result__die--dropped',
};

const SUMMARY_CLASS: Record<DiceResultKind, string> = {
  critical: 'dice-result__summary--critical',
  success: '',
  partial: '',
  failure: 'dice-result__summary--failure',
  botch: 'dice-result__summary--botch',
  neutral: '',
};

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

const SHAPE_CLASS: Partial<Record<DiceShape, string>> = {
  triangle: 'dice-result__die--triangle',
};

// Outlines in a 100x100 box; regular polygons are inscribed so the shape reads the same at any chip size.
const SHAPE_POINTS: Record<Exclude<DiceShape, 'square' | 'circle'>, string> = {
  triangle: '50,2 99,97 1,97',
  diamond: '50,2 96,50 50,98 4,50',
  pentagon: '50,3 97,37 79,95 21,95 3,37',
  hexagon: '50,2 93,26 93,74 50,98 7,74 7,26',
  heptagon: '50,5 87,23 96,62 70,94 30,94 4,62 13,23',
  decagon: '50,2 78,11 96,35 96,65 78,89 50,98 22,89 4,65 4,35 22,11',
};

// Each corner is cut back along its edges and joined with a curve, matching the square's rounded corners.
// The result is stretched to fill the chip box so no shape looks smaller than the others.
const roundedPolygonPath = (points: string, radius = 12, inset = 2) => {
  const vertices = points.split(' ').map((point) => point.split(',').map(Number));
  const corners = vertices.map((vertex, index) => {
    const previous = vertices[(index + vertices.length - 1) % vertices.length];
    const next = vertices[(index + 1) % vertices.length];
    const towards = (to: number[]) => {
      const dx = to[0] - vertex[0];
      const dy = to[1] - vertex[1];
      const length = Math.hypot(dx, dy);
      const step = Math.min(radius, length / 2) / length;
      return [vertex[0] + dx * step, vertex[1] + dy * step];
    };
    return { start: towards(previous), control: vertex, end: towards(next) };
  });

  const sampled = corners.flatMap(({ start, control, end }) => Array.from({ length: 11 }, (_, step) => {
    const t = step / 10;
    const mix = (axis: number) => (1 - t) * (1 - t) * start[axis] + 2 * (1 - t) * t * control[axis] + t * t * end[axis];
    return [mix(0), mix(1)];
  }));
  const bounds = [0, 1].map((axis) => {
    const values = sampled.map((point) => point[axis]);
    return { min: Math.min(...values), span: Math.max(...values) - Math.min(...values) };
  });
  const fit = (point: number[]) => point.map((value, axis) => (
    Math.round((inset + ((value - bounds[axis].min) / bounds[axis].span) * (100 - inset * 2)) * 100) / 100
  ));

  return `${corners.map(({ start, control, end }, index) => (
    `${index === 0 ? 'M' : 'L'}${fit(start).join(' ')} Q${fit(control).join(' ')} ${fit(end).join(' ')}`
  )).join(' ')} Z`;
};

const SHAPE_PATHS = Object.fromEntries(
  // The decagon's edges are short, so the default radius would round it into a circle.
  Object.entries(SHAPE_POINTS).map(([shape, points]) => [shape, roundedPolygonPath(points, shape === 'decagon' ? 3 : undefined)]),
) as Record<keyof typeof SHAPE_POINTS, string>;

function DieShape({ shape }: { shape: DiceShape }) {
  return (
    <svg className="dice-result__shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {shape === 'circle'
        ? <ellipse cx="50" cy="50" rx="48" ry="48" />
        : shape === 'square'
          ? <rect x="2" y="2" width="96" height="96" rx="14" />
          : <path d={SHAPE_PATHS[shape]} />}
    </svg>
  );
}

interface Props {
  output: DiceResultOutput;
  /** `inline` sits in the lower part of the widget; `overlay` is hosted by the floating dialog. */
  variant: 'inline' | 'overlay';
  /** Overlay only: lets the dialog hide itself while the 3D dice roll. */
  onBusyChange?: (busy: boolean) => void;
}

export function DiceResultContent({ output, variant, onBusyChange }: Props) {
  const { view, reroll } = output;
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [rerolling, setRerolling] = useState(false);

  useEffect(() => {
    setSelected(new Set());
  }, [output]);

  const toggleDie = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  };

  const rerollSelected = async () => {
    if (!reroll || selected.size === 0 || rerolling) return;
    setRerolling(true);
    onBusyChange?.(true);
    try {
      await reroll([...selected].sort((a, b) => a - b));
    } finally {
      setRerolling(false);
      onBusyChange?.(false);
    }
  };

  const inline = variant === 'inline';
  // A lone die with no modifier already shows its total; pool outcomes (non-neutral kinds) always keep their summary.
  const showSummary = !!view.summary && !(
    view.dice.length === 1
    && (view.kind ?? 'neutral') === 'neutral'
    && !view.modifiers?.length
    && !view.dice[0].value.includes(' → ')
  );
  const hasFooter = !!view.note
    || showSummary
    || !!view.modifiers?.length;

  return (
    <div
      className={`dice-result-content ${inline ? 'dice-result-content--inline' : ''} ${inline && rerolling ? 'invisible' : ''}`}
      data-touch-camera-ignore="true"
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onWheel={stopPropagation}
    >
      {inline && view.source && <div className="dice-result-dialog__subtitle text-center">{view.source}</div>}
      {view.error && <div className="dice-result-dialog__error">{view.error}</div>}

      {view.dice.length > 0 && (
        <div className="dice-result__dice" aria-live="polite">
          {view.dice.map((die, index) => {
            const shape = getDiceShape(die.faces);
            const className = [
              'dice-result__die',
              SHAPE_CLASS[shape] ?? '',
              DIE_STATE_CLASS[die.state],
              die.groupStart ? 'dice-result__die--group-start' : '',
              selected.has(index) ? 'dice-result__die--selected' : '',
              reroll ? 'dice-result__die--selectable' : '',
            ].join(' ');
            const key = `${index}-${die.version ?? 0}`;
            const style = { animationDelay: `${Math.min(index, 20) * 25}ms` };
            const content = (
              <>
                <DieShape shape={shape} />
                <span className="dice-result__die-value">{die.value}</span>
              </>
            );
            if (!reroll) return <span key={key} title={die.title} className={className} style={style}>{content}</span>;
            return (
              <button
                key={key}
                type="button"
                title={die.title}
                aria-pressed={selected.has(index)}
                className={className}
                style={style}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDie(index);
                }}
              >
                {content}
              </button>
            );
          })}
          {reroll && selected.size > 0 && (
            <button
              type="button"
              className="widget-control widget-control--primary ml-1.5 h-auto min-h-[1.5rem] self-center px-3 py-0.5 text-center text-xs font-semibold leading-tight"
              onClick={(event) => {
                event.stopPropagation();
                void rerollSelected();
              }}
            >
              Reroll {selected.size} {selected.size === 1 ? 'die' : 'dice'}
            </button>
          )}
        </div>
      )}

      {(hasFooter) && (
        <div className="dice-result-content__footer">
          {view.modifiers && view.modifiers.length > 0 && (
            <div className="dice-result-dialog__modifiers">{view.modifiers.join(' ')}</div>
          )}
          {showSummary && (
            <div className={`dice-result__summary ${SUMMARY_CLASS[view.kind ?? 'neutral']}`}>{view.summary}</div>
          )}
          {view.note && (
            <div className={`dice-result-dialog__note ${view.note.tone === 'good' ? 'text-green-600' : 'text-red-600'}`}>
              {view.note.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
