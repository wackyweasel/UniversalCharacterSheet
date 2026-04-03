import { useState } from 'react';
import { Widget, StepDiceItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

const DEFAULT_DICE_CHAIN = [4, 6, 8, 10, 12, 20];

export default function StepDiceWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, stepDiceItems = [], stepDiceChain } = widget.data;
  const diceChain = stepDiceChain && stepDiceChain.length > 0 ? stepDiceChain : DEFAULT_DICE_CHAIN;
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<Record<number, number>>({});

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

  const rollDie = (index: number) => {
    const item = stepDiceItems[index];
    const faces = diceChain[item.currentStep];
    setRollingIndex(index);

    setTimeout(() => {
      const result = Math.floor(Math.random() * faces) + 1;
      setLastResults(prev => ({ ...prev, [index]: result }));
      setRollingIndex(null);
      addTimelineEvent(
        label || 'Step Dice',
        'STEP_DICE',
        `${item.name}: d${faces} → ${result}`,
        '🎲'
      );
    }, 300);
  };

  if (stepDiceItems.length === 0) {
    return (
      <div className="flex flex-col h-full p-2">
        {label && (
          <div className="text-xs font-bold text-theme-ink font-heading truncate mb-1">{label}</div>
        )}
        <div className="flex-1 flex items-center justify-center text-theme-muted text-xs">
          No items configured
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2 gap-1 overflow-auto">
      {label && (
        <div className="text-xs font-bold text-theme-ink font-heading truncate mb-0.5">{label}</div>
      )}
      {stepDiceItems.map((item: StepDiceItem, i: number) => {
        const faces = diceChain[item.currentStep];
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
                className="w-6 h-6 flex items-center justify-center text-[10px] rounded-button border border-theme-border text-theme-ink hover:bg-theme-accent hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-theme-ink transition-colors flex-shrink-0"
              >
                ▼
              </button>
            )}

            {/* Die display + roll button */}
            {mode !== 'print' ? (
              <button
                onClick={() => rollDie(i)}
                className={`min-w-[44px] h-6 px-1.5 flex items-center justify-center text-xs font-bold rounded-button border border-theme-border text-theme-ink hover:bg-theme-accent hover:text-white transition-colors flex-shrink-0 ${isRolling ? 'animate-pulse bg-theme-accent/20' : ''}`}
              >
                d{faces}
              </button>
            ) : (
              <span className="min-w-[44px] h-6 px-1.5 flex items-center justify-center text-xs font-bold text-theme-ink flex-shrink-0">
                d{faces}
              </span>
            )}

            {/* Step up button */}
            {mode !== 'print' && (
              <button
                onClick={() => stepUp(i)}
                disabled={isAtMax}
                className="w-6 h-6 flex items-center justify-center text-[10px] rounded-button border border-theme-border text-theme-ink hover:bg-theme-accent hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-theme-ink transition-colors flex-shrink-0"
              >
                ▲
              </button>
            )}

            {/* Result */}
            {result !== undefined && mode !== 'print' && (
              <div className="min-w-[24px] text-center text-xs font-bold text-theme-accent flex-shrink-0">
                {isRolling ? '…' : result}
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
