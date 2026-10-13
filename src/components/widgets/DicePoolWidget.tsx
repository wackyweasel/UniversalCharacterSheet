import { useState } from 'react';
import type { CSSProperties } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import type { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { isFormulaBroken } from '../../utils/formulaEngine';
import type { DiceExpressionTerm } from '../../utils/diceExpression';
import { rollDiceTerms } from '../../utils/diceRoll';
import {
  MAX_POOL_BONUS,
  describePoolGroups,
  evaluatePoolRoll,
  formatPoolDice,
  getPoolGroups,
  getRollPlan,
  normalizeDiceCount,
  normalizePoolBonus,
  type PoolDieState,
  type PoolGroup,
  type PoolOutcome,
  type PoolOutcomeKind,
} from '../../utils/dicePool';

interface PoolResult {
  groups: PoolGroup[];
  rolls: number[][];
  keepLowest: boolean;
  outcome: PoolOutcome;
  rerollCount: number;
  // Reroll number that last produced each die, used to replay the pop animation on rerolled dice only.
  versions: number[];
}

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const DIE_STATE_CLASS: Record<PoolDieState, string> = {
  hit: 'dice-pool__die--hit',
  best: 'dice-pool__die--best',
  miss: '',
  cancel: 'dice-pool__die--cancel',
  dropped: 'dice-pool__die--dropped',
};

const SUMMARY_CLASS: Record<PoolOutcomeKind, string> = {
  critical: 'dice-pool__summary--critical',
  success: 'dice-pool__summary--success',
  partial: 'dice-pool__summary--partial',
  failure: 'dice-pool__summary--failure',
  botch: 'dice-pool__summary--botch',
};

const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

export default function DicePoolWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, dicePoolButtonText } = widget.data;
  const components = widget.data.dicePoolComponents ?? [];
  const bonus = normalizePoolBonus(widget.data.dicePoolBonus);
  const fieldFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  const formulas = [
    fieldFormulas?.dicePoolTarget,
    ...components.map((component) => component.diceFormula),
  ].filter((formula): formula is string => !!formula);
  const labels = useFormulaLabels(formulas.length > 0);
  const brokenFormula = formulas.find((formula) => isFormulaBroken(formula, labels));

  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<PoolResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const outcome = result?.outcome ?? null;
  const canEdit = interactive && mode === 'play';
  const timelineLabel = label || 'Dice pool';

  const groups = getPoolGroups(widget.data);
  const poolSize = groups.reduce((sum, group) => sum + group.count, 0);
  const faces = [...new Set(groups.map((group) => group.faces))];
  const sizeText = poolSize === 0 ? 'No dice' : faces.length === 1 ? `${poolSize}d${faces[0]}` : `${poolSize} dice`;
  const plan = getRollPlan(widget.data);
  const canRoll = canEdit && plan.groups.length > 0 && !rolling;
  const canRerollDice = canEdit && !!result && !result.keepLowest;
  const showBonus = widget.data.dicePoolShowBonus !== false || components.length === 0;
  const hasSelection = components.some((component) => component.active) || bonus !== 0;

  const toggleComponent = (id: string) => {
    if (!canEdit) return;
    updateWidgetData(widget.id, {
      dicePoolComponents: components.map((component) => (component.id === id ? { ...component, active: !component.active } : component)),
    });
  };

  const changeBonus = (delta: number) => {
    if (!canEdit) return;
    const next = normalizePoolBonus(bonus + delta);
    if (next !== bonus) updateWidgetData(widget.id, { dicePoolBonus: next });
  };

  const clearPool = () => {
    if (!canEdit) return;
    updateWidgetData(widget.id, {
      dicePoolComponents: components.map((component) => (component.active ? { ...component, active: false } : component)),
      dicePoolBonus: 0,
    });
  };

  const roll = async () => {
    if (!canRoll) return;
    setRolling(true);
    try {
      const terms: DiceExpressionTerm[] = plan.groups.map((group) => ({ type: 'dice', sign: 1, count: group.count, faces: group.faces }));
      const result = await rollDiceTerms(terms);
      const rolls = plan.groups.map((_, index) => result.terms[index]?.rolls ?? []);
      const next = evaluatePoolRoll(widget.data, plan.groups, rolls, plan.keepLowest);
      setResult({
        groups: plan.groups,
        rolls,
        keepLowest: plan.keepLowest,
        outcome: next,
        rerollCount: 0,
        versions: next.dice.map(() => 0),
      });
      setSelected(new Set());
      addTimelineEvent(timelineLabel, 'DICE_POOL', `${describePoolGroups(plan.groups)}: ${formatPoolDice(next)} → ${next.summary}`, '🎲');
      if (widget.data.dicePoolClearAfterRoll && hasSelection) clearPool();
    } finally {
      setRolling(false);
    }
  };

  const toggleDie = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  };

  const reroll = async () => {
    if (!canEdit || !result || selected.size === 0 || rolling) return;
    const offsets: number[] = [];
    let total = 0;
    for (const group of result.rolls) {
      offsets.push(total);
      total += group.length;
    }
    const targets = result.groups
      .map((group, groupIndex) => ({
        group,
        groupIndex,
        positions: result.rolls[groupIndex].map((_, position) => position).filter((position) => selected.has(offsets[groupIndex] + position)),
      }))
      .filter((target) => target.positions.length > 0);
    if (targets.length === 0) return;

    setRolling(true);
    try {
      const terms: DiceExpressionTerm[] = targets.map(({ group, positions }) => ({ type: 'dice', sign: 1, count: positions.length, faces: group.faces }));
      const rolled = await rollDiceTerms(terms);
      const rolls = result.rolls.map((group) => [...group]);
      const versions = [...result.versions];
      const rerollCount = result.rerollCount + 1;
      targets.forEach(({ groupIndex, positions }, termIndex) => {
        const values = rolled.terms[termIndex]?.rolls ?? [];
        positions.forEach((position, k) => {
          if (values[k] === undefined) return;
          rolls[groupIndex][position] = values[k];
          versions[offsets[groupIndex] + position] = rerollCount;
        });
      });
      const next = evaluatePoolRoll(widget.data, result.groups, rolls, result.keepLowest);
      setResult({ ...result, rolls, outcome: next, rerollCount, versions });
      setSelected(new Set());
      addTimelineEvent(
        timelineLabel,
        'DICE_POOL',
        `Rerolled ${selected.size} ${selected.size === 1 ? 'die' : 'dice'}: ${formatPoolDice(next)} → ${next.summary}`,
        '🎲',
      );
    } finally {
      setRolling(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setSelected(new Set());
  };

  return (
    <div className="dice-pool-widget flex h-full w-full flex-col gap-1.5 overflow-auto font-body">
      {(label || mode === 'play') && (
        <div className="widget-header flex-shrink-0">
          {label && (
            <div className="widget-header-title min-w-0 flex-1 truncate">
              <InlineFormulaText text={label} />
            </div>
          )}
          <span className="dice-pool__size ml-auto" title={brokenFormula ? `Broken formula: ${brokenFormula}` : undefined}>
            {brokenFormula && <span className="mr-0.5 text-[9px] text-red-500">⚠</span>}
            {sizeText}
          </span>
        </div>
      )}

      {components.length > 0 && (
        <div className="dice-pool__chips" role="group" aria-label="Dice pool traits" data-touch-camera-ignore={canEdit ? 'true' : undefined}>
          {components.map((component) => {
            const count = normalizeDiceCount(component.dice);
            const name = component.name?.trim() || 'Dice';
            const className = `dice-pool__chip ${component.active ? 'dice-pool__chip--active' : ''}`;
            const content = (
              <>
                <span className="min-w-0 truncate">{name}</span>
                <span className="dice-pool__chip-count">{count}</span>
              </>
            );
            if (!canEdit) return <span key={component.id} className={className}>{content}</span>;
            return (
              <button
                key={component.id}
                type="button"
                className={className}
                aria-pressed={component.active}
                aria-label={`${name}, ${count} ${count === 1 ? 'die' : 'dice'}`}
                onMouseDown={stopPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleComponent(component.id);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'play' && (
        <div className="dice-pool__controls" data-touch-camera-ignore="true">
          {showBonus && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-theme-muted">Extra dice</span>
              <Tooltip content="Remove a die from this roll">
                <button
                  type="button"
                  aria-label="Remove a die"
                  disabled={!canEdit || bonus <= -MAX_POOL_BONUS}
                  className="widget-control h-5 min-h-0 w-5 flex-shrink-0 text-xs font-bold"
                  onMouseDown={stopPropagation}
                  onClick={(event) => {
                    event.stopPropagation();
                    changeBonus(-1);
                  }}
                >
                  −
                </button>
              </Tooltip>
              <span className="dice-pool__bonus" aria-live="polite">{bonus > 0 ? `+${bonus}` : bonus}</span>
              <Tooltip content="Add a die to this roll">
                <button
                  type="button"
                  aria-label="Add a die"
                  disabled={!canEdit || bonus >= MAX_POOL_BONUS}
                  className="widget-control h-5 min-h-0 w-5 flex-shrink-0 text-xs font-bold"
                  onMouseDown={stopPropagation}
                  onClick={(event) => {
                    event.stopPropagation();
                    changeBonus(1);
                  }}
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
          {hasSelection && (
            <button
              type="button"
              className="widget-control ml-auto h-5 min-h-0 px-2 text-[11px]"
              onMouseDown={stopPropagation}
              onClick={(event) => {
                event.stopPropagation();
                clearPool();
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {mode === 'play' && (
        <button
          type="button"
          disabled={!canRoll}
          className="widget-control widget-control--primary h-8 min-h-0 flex-shrink-0 px-3 text-sm font-semibold"
          onMouseDown={stopPropagation}
          onClick={(event) => {
            event.stopPropagation();
            void roll();
          }}
        >
          {rolling ? 'Rolling…' : plan.groups.length === 0 ? 'Add dice to roll' : dicePoolButtonText?.trim() || 'Roll'}
        </button>
      )}

      {result && outcome && !rolling && (
        <div className="dice-pool__result" aria-live="polite">
          <div className="dice-pool__dice" data-touch-camera-ignore={canEdit ? 'true' : undefined}>
            {outcome.dice.map((die, index) => {
              const className = [
                'dice-pool__die',
                DIE_STATE_CLASS[die.state],
                index > 0 && outcome.dice[index - 1].group !== die.group ? 'dice-pool__die--group-start' : '',
                selected.has(index) ? 'dice-pool__die--selected' : '',
                canRerollDice ? 'dice-pool__die--selectable' : '',
              ].join(' ');
              const key = `${index}-${result.versions[index] ?? 0}`;
              const style = { animationDelay: `${Math.min(index, 20) * 25}ms` } as CSSProperties;
              if (!canRerollDice) {
                return <span key={key} title={`${die.group} (d${die.faces})`} className={className} style={style}>{die.value}</span>;
              }
              return (
                <button
                  key={key}
                  type="button"
                  title={`${die.group} (d${die.faces})`}
                  aria-pressed={selected.has(index)}
                  className={className}
                  style={style}
                  onMouseDown={stopPropagation}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDie(index);
                  }}
                >
                  {die.value}
                </button>
              );
            })}
          </div>
          <div className={`dice-pool__summary ${SUMMARY_CLASS[outcome.kind]}`}>{outcome.summary}</div>
          {canEdit && (
            <div className="flex items-center justify-center gap-1.5" data-touch-camera-ignore="true">
              {selected.size > 0 && (
                <button
                  type="button"
                  className="widget-control widget-control--primary h-5 min-h-0 px-2 text-[11px] font-semibold"
                  onMouseDown={stopPropagation}
                  onClick={(event) => {
                    event.stopPropagation();
                    void reroll();
                  }}
                >
                  Reroll {selected.size} {selected.size === 1 ? 'die' : 'dice'}
                </button>
              )}
              <button
                type="button"
                className="widget-control widget-control--subtle h-5 min-h-0 px-2 text-[11px]"
                onMouseDown={stopPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  clearResults();
                }}
              >
                Clear results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
