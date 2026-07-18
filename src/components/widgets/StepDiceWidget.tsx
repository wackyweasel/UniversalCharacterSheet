import { useState } from 'react';
import { createPortal } from 'react-dom';
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
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';
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
  showFieldControls?: boolean;
  interactive?: boolean;
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

export default function StepDiceWidget({ widget, mode, showFieldControls = true, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, stepDiceItems = [], stepDiceChain } = widget.data;
  const diceChain = stepDiceChain && stepDiceChain.length > 0 ? stepDiceChain : DEFAULT_DICE_CHAIN;
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<Record<number, DiceExpressionRollResult>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);
  const [itemNameDraft, setItemNameDraft] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && interactive && mode !== 'print';

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

  const addItems = () => {
    const name = itemNameDraft.trim();
    if (!name) return;

    updateWidgetData(widget.id, {
      stepDiceItems: [...stepDiceItems, { name, currentStep: 0 }],
    });
    setItemNameDraft('');
    if (!addMultiple) setShowAddDialog(false);
    addTimelineEvent(label || 'Step Dice', 'STEP_DICE', `Added: ${name}`, '➕');
  };

  const removeSelectedItems = () => {
    if (selectedItems.size === 0) return;
    const removedNames = (stepDiceItems as StepDiceItem[])
      .filter((_, index) => selectedItems.has(index))
      .map((item) => item.name);
    updateWidgetData(widget.id, {
      stepDiceItems: stepDiceItems.filter((_, index) => !selectedItems.has(index)),
    });
    setSelectedItems(new Set());
    setShowRemoveDialog(false);
    addTimelineEvent(label || 'Step Dice', 'STEP_DICE', `Removed: ${removedNames.join(', ')}`, '➖');
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full p-2 gap-1 overflow-auto">
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && <div className="min-w-0 flex-1 truncate text-xs font-bold text-theme-ink font-heading">{label}</div>}
          {controlsVisible && (
            <div className="step-dice-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={stepDiceItems.length > 0 ? 'Choose die tracks to remove' : 'No die tracks to remove'}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItems(new Set());
                    setShowRemoveDialog(true);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={stepDiceItems.length === 0}
                  aria-label="Choose die tracks to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add die track">
                <button
                  type="button"
                  onClick={() => {
                    setItemNameDraft('');
                    setAddMultiple(false);
                    setShowAddDialog(true);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add die track"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
      {stepDiceItems.length === 0 ? (
        <WidgetEmptyState title="No step dice configured" hint={controlsVisible ? 'Use + to add a die track.' : undefined} />
      ) : stepDiceItems.map((item: StepDiceItem, i: number) => {
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

      {showAddDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setShowAddDialog(false)}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`step-dice-add-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onSubmit={(event) => {
              event.preventDefault();
              addItems();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`step-dice-add-title-${widget.id}`} className="font-heading text-base font-bold">Add die track</h3>
            <label htmlFor={`step-dice-name-${widget.id}`} className="mt-3 block text-sm font-medium">Name</label>
            <input
              id={`step-dice-name-${widget.id}`}
              autoFocus
              value={itemNameDraft}
              onChange={(event) => setItemNameDraft(event.target.value)}
              className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink focus:border-theme-accent focus:outline-none"
            />
            <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddDialog(false)} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" disabled={!itemNameDraft.trim()} className="widget-control widget-control--primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">Add die track</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {showRemoveDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setShowRemoveDialog(false)}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`step-dice-remove-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`step-dice-remove-title-${widget.id}`} className="font-heading text-base font-bold">Remove die tracks</h3>
            <p className="mt-2 text-sm text-theme-muted">Select one or more die tracks to remove.</p>
            <SelectionActions
              onCheckAll={() => setSelectedItems(new Set(stepDiceItems.map((_, index) => index)))}
              onUncheckAll={() => setSelectedItems(new Set())}
            />
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {(stepDiceItems as StepDiceItem[]).map((item, index) => (
                <label key={index} className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => toggleItemSelection(index)}
                    className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name || `Die track ${index + 1}`}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setShowRemoveDialog(false)} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
              <button
                type="button"
                onClick={removeSelectedItems}
                disabled={selectedItems.size === 0}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
