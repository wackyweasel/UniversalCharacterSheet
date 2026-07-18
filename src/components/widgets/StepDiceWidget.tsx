import { useState } from 'react';
import { Widget, StepDiceItem } from '../../types';
import {
  DiceExpressionRollResult,
  DiceExpressionTerm,
  DiceStep,
  formatDiceExpression,
  formatDiceRollDetail,
  formatDiceStep,
  parseDiceStep,
} from '../../utils/diceExpression';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';
import {
  isPhysicalDieSupported,
  rollPhysicalDice,
  type PhysicalDieRequest,
} from '../DicePhysicsOverlay';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

const DEFAULT_DICE_CHAIN: DiceStep[] = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];

const getPhysicalDiceRequests = (terms: DiceExpressionTerm[]): PhysicalDieRequest[] => (
  terms.flatMap((term) => {
    if (term.type !== 'dice') return [];

    if (term.faces === 100) {
      return Array.from({ length: term.count }, () => [
        { faces: 10 },
        { faces: 100, notation: 'd100' as const },
      ]).flat();
    }

    return isPhysicalDieSupported(term.faces)
      ? Array.from({ length: term.count }, () => ({ faces: term.faces }))
      : [];
  })
);

const rollDiceStep = async (terms: DiceExpressionTerm[]): Promise<DiceExpressionRollResult> => {
  const physicalDice = getPhysicalDiceRequests(terms);
  const physicalValues = physicalDice.length > 0
    ? await rollPhysicalDice(physicalDice)
    : await new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 300));
  let physicalValueIndex = 0;
  let total = 0;

  const rollTerms = terms.map((term) => {
    if (term.type === 'modifier') {
      const signedTotal = term.sign * term.value;
      total += signedTotal;
      return { term, signedTotal };
    }

    const usesPhysicalDice = term.faces === 100 || isPhysicalDieSupported(term.faces);
    const rolls = Array.from({ length: term.count }, () => {
      let physicalValue: number | undefined;

      if (term.faces === 100) {
        const units = physicalValues?.[physicalValueIndex];
        const tens = physicalValues?.[physicalValueIndex + 1];
        if (units !== undefined && tens !== undefined) {
          physicalValue = (tens % 100) + (units % 10) || 100;
        }
        physicalValueIndex += 2;
      } else if (usesPhysicalDice) {
        physicalValue = physicalValues?.[physicalValueIndex];
        physicalValueIndex += 1;
      }

      return physicalValue ?? Math.floor(Math.random() * term.faces) + 1;
    });
    const signedTotal = term.sign * rolls.reduce((sum, roll) => sum + roll, 0);
    total += signedTotal;
    return { term, rolls, signedTotal };
  });

  return {
    expression: formatDiceExpression(terms),
    total,
    terms: rollTerms,
  };
};

export default function StepDiceWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, stepDiceItems = [], stepDiceChain } = widget.data;
  const diceChain = stepDiceChain && stepDiceChain.length > 0 ? stepDiceChain : DEFAULT_DICE_CHAIN;
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<Record<number, DiceExpressionRollResult>>({});

  const stepUp = (index: number) => {
    const items = [...stepDiceItems] as StepDiceItem[];
    if (items[index].currentStep < diceChain.length - 1) {
      items[index] = { ...items[index], currentStep: items[index].currentStep + 1 };
      updateWidgetData(widget.id, { stepDiceItems: items });
    }
  };

  const stepDown = (index: number) => {
    const items = [...stepDiceItems] as StepDiceItem[];
    if (items[index].currentStep > 0) {
      items[index] = { ...items[index], currentStep: items[index].currentStep - 1 };
      updateWidgetData(widget.id, { stepDiceItems: items });
    }
  };

  const rollDie = async (index: number) => {
    const item = stepDiceItems[index];
    const terms = parseDiceStep(diceChain[item.currentStep]);
    if (!terms) return;

    setRollingIndex(index);
    try {
      const result = await rollDiceStep(terms);
      setLastResults(prev => ({ ...prev, [index]: result }));
      addTimelineEvent(
        label || 'Step Dice',
        'STEP_DICE',
        `${item.name}: ${formatDiceRollDetail(result)}`,
        '🎲'
      );
    } finally {
      setRollingIndex(null);
    }
  };

  if (stepDiceItems.length === 0) {
    return (
      <div className="flex flex-col h-full p-2">
        {label && (
          <div className="text-xs font-bold text-theme-ink font-heading truncate mb-1">{label}</div>
        )}
        <WidgetEmptyState title="No step dice configured" hint="Add a die track in Build." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2 gap-1 overflow-auto">
      {label && (
        <div className="text-xs font-bold text-theme-ink font-heading truncate mb-0.5">{label}</div>
      )}
      {stepDiceItems.map((item: StepDiceItem, i: number) => {
        const expression = formatDiceStep(diceChain[item.currentStep]);
        const isValidExpression = !!parseDiceStep(diceChain[item.currentStep]);
        const isAtMin = item.currentStep === 0;
        const isAtMax = item.currentStep === diceChain.length - 1;
        const isRolling = rollingIndex === i;
        const result = lastResults[i];

        const row = (
          <div key={i} className="flex items-center gap-1 min-h-[28px]">
            {/* Item name */}
            <div className="text-xs text-theme-ink font-body truncate min-w-0 flex-shrink" style={{ flex: '1 1 0' }}>
              {item.name}
            </div>

            {/* Step down button */}
            {mode !== 'print' && (
              <button
                onClick={() => stepDown(i)}
                disabled={isAtMin}
                aria-label={`Step ${item.name} down from ${expression}`}
                className="widget-control w-6 h-6 min-h-0 text-[10px] disabled:opacity-30 flex-shrink-0"
              >
                ▼
              </button>
            )}

            {/* Die display + roll button */}
            {mode !== 'print' ? (
              <button
                onClick={() => rollDie(i)}
                disabled={!isValidExpression}
                aria-label={`Roll ${item.name}: ${expression}`}
                className={`min-w-[52px] max-w-[112px] h-6 px-1.5 flex items-center justify-center text-xs font-bold rounded-button border border-theme-border text-theme-ink hover:bg-theme-accent hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-theme-ink transition-colors flex-shrink-0 truncate ${isRolling ? 'animate-pulse bg-theme-accent/20' : ''}`}
              >
                {expression}
              </button>
            ) : (
              <span className="min-w-[52px] max-w-[112px] h-6 px-1.5 flex items-center justify-center text-xs font-bold text-theme-ink flex-shrink-0 truncate">
                {expression}
              </span>
            )}

            {/* Step up button */}
            {mode !== 'print' && (
              <button
                onClick={() => stepUp(i)}
                disabled={isAtMax}
                aria-label={`Step ${item.name} up from ${expression}`}
                className="widget-control w-6 h-6 min-h-0 text-[10px] disabled:opacity-30 flex-shrink-0"
              >
                ▲
              </button>
            )}

            {/* Result */}
            {result !== undefined && mode !== 'print' && (
              <div className="min-w-[24px] text-center text-xs font-bold text-theme-accent flex-shrink-0" title={formatDiceRollDetail(result)}>
                {isRolling ? '…' : result.total}
              </div>
            )}
          </div>
        );

        if (item.tooltip) {
          return (
            <Tooltip key={i} content={item.tooltip}>
              {row}
            </Tooltip>
          );
        }
        return row;
      })}
    </div>
  );
}
