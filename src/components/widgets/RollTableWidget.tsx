import { useEffect, useRef, useState } from 'react';
import { RollTableItem, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { ChevronDownIcon, MinusIcon, PlusIcon } from '../icons';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function RollTableWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const {
    label,
    rollTableItems = [{ text: '', weight: 1 }],
    showRollTableItems = true,
    rollTableAnimate = true,
    rollTableResultCount = 1,
    rollTableAllowRepeats = true,
  } = widget.data;
  const [rolledResults, setRolledResults] = useState<RollTableItem[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [highlightedItemIndices, setHighlightedItemIndices] = useState<number[]>([]);
  const [expandedItemIndices, setExpandedItemIndices] = useState<number[]>([]);
  const animationTimeoutRef = useRef<number | null>(null);
  const previousWeightsRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const buttonClass = 'py-1 px-2 text-xs';
  const gapClass = 'gap-1';

  // Ensure items array has at least one item
  const normalizedItems = rollTableItems.length > 0 
    ? rollTableItems 
    : [{ text: '', weight: 1 }];

  const selectWeightedItem = (items: typeof normalizedItems) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const roll = Math.random() * totalWeight;
    let cumulative = 0;

    for (const item of items) {
      cumulative += item.weight;
      if (roll < cumulative) return item;
    }

    return items[items.length - 1];
  };

  const completeRoll = (selectedItems: typeof normalizedItems) => {
    setRolledResults(selectedItems);
    setHighlightedItemIndices(
      showRollTableItems
        ? selectedItems.map((item) => normalizedItems.indexOf(item)).filter((index) => index >= 0)
        : [],
    );
    setIsRolling(false);
    const resultDescription = selectedItems.map((item) => `"${item.text}"`).join(', ');
    addTimelineEvent(label || 'Roll Table', 'ROLL_TABLE', `Rolled: ${resultDescription}`, '🎰');
  };

  const animateRoll = (validItems: typeof normalizedItems, selectedItems: typeof normalizedItems) => {
    const animationDuration = 2000;
    const totalSteps = Math.max(validItems.length + 4, 16);
    const startedAt = window.performance.now();
    let step = 0;

    const highlightNextItem = () => {
      const elapsed = window.performance.now() - startedAt;
      if (elapsed >= animationDuration) {
        animationTimeoutRef.current = null;
        completeRoll(selectedItems);
        return;
      }

      const laneOffset = Math.max(1, Math.floor(validItems.length / selectedItems.length));
      setHighlightedItemIndices(
        selectedItems.map((_, laneIndex) => {
          const laneSpeed = 0.72 + (laneIndex % 6) * 0.13;
          const itemIndex = (Math.floor(step * laneSpeed) + laneIndex * laneOffset) % validItems.length;
          return normalizedItems.indexOf(validItems[itemIndex]);
        }),
      );
      step += 1;

      const progress = step / totalSteps;
      const stepDuration = (animationDuration / totalSteps) * (0.35 + 2 * progress * progress);
      animationTimeoutRef.current = window.setTimeout(highlightNextItem, stepDuration);
    };

    highlightNextItem();
  };

  const rollTable = () => {
    setExpandedItemIndices([]);
    const validItems = normalizedItems.filter(item => item.text.trim() && item.weight > 0);

    if (validItems.length === 0) {
      setRolledResults([{ text: 'No valid items to roll!', weight: 0 }]);
      setHighlightedItemIndices([]);
      return;
    }

    const resultCount = Math.min(100, Math.max(1, Math.floor(Number(rollTableResultCount) || 1)));
    const selectedItems: typeof normalizedItems = [];
    const availableItems = [...validItems];
    const allowRepeats = rollTableAllowRepeats !== false;
    const picksToMake = allowRepeats ? resultCount : Math.min(resultCount, availableItems.length);

    for (let index = 0; index < picksToMake; index += 1) {
      const pool = allowRepeats ? validItems : availableItems;
      const selectedItem = selectWeightedItem(pool);
      selectedItems.push(selectedItem);

      if (!allowRepeats) {
        availableItems.splice(availableItems.indexOf(selectedItem), 1);
      }
    }

    setRolledResults([]);
  setHighlightedItemIndices([]);

    if (showRollTableItems && rollTableAnimate) {
      setIsRolling(true);
      animateRoll(validItems, selectedItems);
    } else {
      completeRoll(selectedItems);
    }
  };

  // Calculate normalized probability for display
  const getTotalWeight = () => {
    return normalizedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
  };

  const getPercentage = (weight: number) => {
    const total = getTotalWeight();
    if (total === 0) return 0;
    return Math.round((weight / total) * 100);
  };

  const toggleItemInPool = (index: number) => {
    const item = normalizedItems[index];
    if (!item || item.weightFormula?.trim()) return;

    const updatedItems = [...rollTableItems];
    if (item.weight > 0) {
      previousWeightsRef.current[index] = item.weight;
      updatedItems[index] = { ...item, weight: 0 };
      addTimelineEvent(label || 'Roll Table', 'ROLL_TABLE', `Removed "${item.text}" from the pool`, '➖');
    } else {
      const restoredWeight = previousWeightsRef.current[index] ?? 1;
      delete previousWeightsRef.current[index];
      updatedItems[index] = { ...item, weight: restoredWeight };
      addTimelineEvent(label || 'Roll Table', 'ROLL_TABLE', `Added "${item.text}" back to the pool`, '➕');
    }

    updateWidgetData(widget.id, { rollTableItems: updatedItems });
  };

  const restoreAllItemsToPool = () => {
    const updatedItems = [...rollTableItems];
    let restoredCount = 0;

    for (const [indexKey, previousWeight] of Object.entries(previousWeightsRef.current)) {
      const index = Number(indexKey);
      const item = updatedItems[index];
      if (!item || item.weightFormula?.trim() || item.weight !== 0) continue;

      updatedItems[index] = { ...item, weight: previousWeight };
      restoredCount += 1;
    }

    previousWeightsRef.current = {};
    if (restoredCount === 0) return;

    updateWidgetData(widget.id, { rollTableItems: updatedItems });
    addTimelineEvent(label || 'Roll Table', 'ROLL_TABLE', `Added ${restoredCount} option${restoredCount === 1 ? '' : 's'} back to the pool`, '➕');
  };

  const hasValidItems = normalizedItems.some((item) => item.text.trim() && item.weight > 0);
  const clearResults = () => {
    setRolledResults([]);
    setHighlightedItemIndices([]);
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}
      
      {/* Roll Button */}
      <Tooltip content="Roll a random result from the table">
        <button
          onClick={rollTable}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} widget-control font-bold flex-shrink-0 ${
            isRolling
              ? 'bg-theme-muted animate-pulse text-theme-paper' 
              : ''
          }`}
          disabled={isRolling || !hasValidItems}
        >
          {hasValidItems ? 'Roll Table' : 'Add an item to roll'}
        </button>
      </Tooltip>

      {/* Result Display */}
      {rolledResults.length > 0 && (
        <div
          className="roll-table-result flex-shrink-0"
          role="button"
          tabIndex={0}
          aria-label="Clear roll result"
          aria-live="polite"
          onClick={clearResults}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              clearResults();
            }
          }}
        >
          <div className="roll-table-result__list">
            {rolledResults.map((result, index) => (
              <div key={`${result.text}-${index}`} className="roll-table-result__item">
                {rolledResults.length > 1 && <span className="roll-table-result__number">{index + 1}</span>}
                <div className="min-w-0 flex-1">
                  <div className="roll-table-result__title-row">
                    <div className="roll-table-result__title">{result.text}</div>
                  </div>
                  {result.description?.trim() && (
                    <div className="roll-table-result__description">{result.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      {showRollTableItems && (
        <div 
          className="space-y-1 overflow-y-auto flex-1 min-h-0"
          onWheel={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight > el.clientHeight) {
              e.stopPropagation();
            }
          }}
        >
          {normalizedItems.map((item, idx) => {
            const hasDescription = Boolean(item.description?.trim());
            const isExpanded = expandedItemIndices.includes(idx);
            const isInPool = item.weight > 0;
            const canTogglePool = mode !== 'print' && Boolean(item.text.trim()) && !item.weightFormula?.trim();

            return (
              <div
                key={idx}
                className={`roll-table-item flex gap-1 group ${isExpanded ? 'items-start' : 'items-center'} ${highlightedItemIndices.includes(idx) ? 'roll-table-item--highlighted' : ''} ${hasDescription ? 'roll-table-item--expandable' : ''}`}
              >
                <div className="roll-table-item__content min-w-0 flex-1">
                  <div
                    className={`roll-table-item__title-row ${hasDescription ? 'roll-table-item__title-row--expandable' : ''}`}
                    role={hasDescription ? 'button' : undefined}
                    tabIndex={hasDescription ? 0 : undefined}
                    aria-expanded={hasDescription ? isExpanded : undefined}
                    aria-label={hasDescription ? `${isExpanded ? 'Collapse' : 'Expand'} description for ${item.text}` : undefined}
                    onClick={hasDescription ? () => setExpandedItemIndices((current) => (
                      isExpanded ? current.filter((itemIndex) => itemIndex !== idx) : [...current, idx]
                    )) : undefined}
                    onMouseDown={hasDescription ? (event) => event.stopPropagation() : undefined}
                    onKeyDown={hasDescription ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedItemIndices((current) => (
                          isExpanded ? current.filter((itemIndex) => itemIndex !== idx) : [...current, idx]
                        ));
                      }
                    } : undefined}
                  >
                    <div className="roll-table-item__title min-w-0">{item.text}</div>
                    {hasDescription && (
                      <ChevronDownIcon className={`roll-table-item__chevron h-3 w-3 flex-none transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                  {isExpanded && (
                    <div className="roll-table-item__description">{item.description}</div>
                  )}
                </div>
                <span className="roll-table-item__percentage text-[10px] text-theme-muted w-8 text-right" title="Probability">
                  {getPercentage(item.weight)}%
                </span>
                {canTogglePool && (
                  <Tooltip content={isInPool ? 'Remove from roll pool' : 'Add back to roll pool'}>
                    <button
                      type="button"
                      className="roll-table-item__pool-toggle"
                      aria-label={isInPool ? `Remove ${item.text} from roll pool` : `Add ${item.text} back to roll pool`}
                      aria-pressed={isInPool}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleItemInPool(idx);
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {isInPool ? <MinusIcon className="h-3 w-3" /> : <PlusIcon className="h-3 w-3" />}
                    </button>
                  </Tooltip>
                )}
              </div>
            );
          })}
          {mode !== 'print' && Object.keys(previousWeightsRef.current).length > 0 && (
            <button
              type="button"
              className="roll-table-item__restore-all"
              onClick={restoreAllItemsToPool}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <PlusIcon className="h-3 w-3" />
              Add all back to pool
            </button>
          )}
        </div>
      )}
    </div>
  );
}






