import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, CustomDie } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
import { trackGoatCounterEvent } from '../../utils/goatCounter';
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
  interactive?: boolean;
  sheetScale?: number;
}

interface DiceInPool {
  faces: number | string[]; // number for standard dice, string[] for custom dice
  id: number;
  customDieName?: string; // Name of the custom die if applicable
}

interface RollResultItem {
  faces: number | string[];
  roll: number | string;
  customDieName?: string;
  id: number; // Unique ID for tracking individual dice
}

interface RollResult {
  dice: RollResultItem[];
  modifier: number;
  total: number | null; // null if no numeric results
  aggregatedResults: AggregatedResult[];
}

interface AggregatedResult {
  value: string;
  count: number;
  isNumeric: boolean;
  numericTotal?: number;
}

// Type guard to check if a die is a custom die
const isCustomDie = (die: number | CustomDie): die is CustomDie => {
  return typeof die === 'object' && 'faces' in die && Array.isArray(die.faces);
};

const DETAILS_VIEWPORT_PADDING = 8;
const DETAILS_OFFSET = 4;
const MIN_DETAILS_WIDTH = 180;
const MAX_DETAILS_WIDTH = 240;

export default function DiceTrayWidget({ widget, mode, interactive = true, sheetScale = 1 }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, availableDice = [4, 6, 8, 10, 12, 20], modifier = 0 } = widget.data;
  const diceButtonScale = Math.min(100, Math.max(50, widget.data.diceButtonScale ?? 100)) / 100;
  const showTrayRollDetails = widget.data.showTrayRollDetails ?? widget.data.showIndividualResults ?? false;
  const showTrayRollDetailsButton = widget.data.showTrayRollDetailsButton ?? true;
  const [dicePool, setDicePool] = useState<DiceInPool[]>([]);
  const [lastRolledPool, setLastRolledPool] = useState<DiceInPool[]>([]);
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rerollingDieId, setRerollingDieId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const resultSummaryRef = useRef<HTMLDivElement>(null);
  const detailsDropdownRef = useRef<HTMLDivElement>(null);
  const [detailsPosition, setDetailsPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 0 });
  const controlsVisible = interactive && mode !== 'print';

  useLayoutEffect(() => {
    if (!showTrayRollDetails || !result || isRolling) return;

    const updateDetailsPosition = () => {
      const anchor = resultSummaryRef.current;
      if (!anchor) return;

      const anchorRect = anchor.getBoundingClientRect();
      const viewportWidth = Math.max(0, window.innerWidth - DETAILS_VIEWPORT_PADDING * 2);
      const width = Math.min(Math.max(anchorRect.width, MIN_DETAILS_WIDTH), viewportWidth, MAX_DETAILS_WIDTH);
      const maxHeight = Math.max(0, window.innerHeight - DETAILS_VIEWPORT_PADDING * 2);
      const dropdownHeight = Math.min(
        detailsDropdownRef.current?.getBoundingClientRect().height ?? 0,
        maxHeight,
      );
      const below = anchorRect.bottom + DETAILS_OFFSET;
      const top = below + dropdownHeight <= window.innerHeight - DETAILS_VIEWPORT_PADDING
        ? below
        : Math.max(DETAILS_VIEWPORT_PADDING, anchorRect.top - dropdownHeight - DETAILS_OFFSET);
      const left = Math.min(
        Math.max(DETAILS_VIEWPORT_PADDING, anchorRect.left),
        Math.max(DETAILS_VIEWPORT_PADDING, window.innerWidth - width - DETAILS_VIEWPORT_PADDING),
      );

      setDetailsPosition({ left, top, width, maxHeight });
    };

    updateDetailsPosition();
    window.addEventListener('resize', updateDetailsPosition);
    window.addEventListener('scroll', updateDetailsPosition, true);
    return () => {
      window.removeEventListener('resize', updateDetailsPosition);
      window.removeEventListener('scroll', updateDetailsPosition, true);
    };
  }, [isRolling, result, showTrayRollDetails, sheetScale]);

  useEffect(() => {
    if (!showTrayRollDetails || !result || isRolling) return;

    const closeDetails = () => updateWidgetData(widget.id, { showTrayRollDetails: false });
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (detailsDropdownRef.current?.contains(target) || resultSummaryRef.current?.contains(target)) return;
      closeDetails();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetails();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRolling, result, showTrayRollDetails, updateWidgetData, widget.id]);

  // Fixed small sizing
  const buttonClass = 'py-1 px-2 text-xs';
  const diceButtonStyle = {
    fontSize: `${0.75 * diceButtonScale}rem`,
    padding: `${0.25 * diceButtonScale}rem ${0.5 * diceButtonScale}rem`,
    minWidth: `${40 * diceButtonScale}px`,
  };
  const resultClass = 'text-xl';
  const smallTextClass = 'text-[10px]';
  const gapClass = 'gap-1';

  // Check if a string is purely numeric
  const isNumericString = (val: string | number): boolean => {
    if (typeof val === 'number') return true;
    return !isNaN(Number(val)) && val.trim() !== '';
  };

  // Split a string into individual graphemes (handles emojis properly)
  const splitIntoGraphemes = (str: string): string[] => {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const SegmenterClass = (Intl as any).Segmenter;
      const segmenter = new SegmenterClass('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s: any) => s.segment);
    }
    return [...str];
  };

  const truncateGraphemes = (value: string, maximum: number): string => {
    const graphemes = splitIntoGraphemes(value.trim());
    if (graphemes.length <= maximum) return graphemes.join('');
    return `${graphemes.slice(0, Math.max(1, maximum - 1)).join('')}…`;
  };

  const balanceLabelLines = (value: string): string => {
    const graphemes = splitIntoGraphemes(value.trim());
    if (graphemes.length <= 4) return graphemes.join('');

    const lineCount = graphemes.length <= 16 ? 2 : 3;
    const maximumLength = lineCount === 2 ? 16 : 30;
    const visible = graphemes.length > maximumLength
      ? [...graphemes.slice(0, maximumLength - 1), '…']
      : graphemes;
    const lineLength = Math.ceil(visible.length / lineCount);
    const lines: string[] = [];

    for (let index = 0; index < visible.length; index += lineLength) {
      lines.push(visible.slice(index, index + lineLength).join(''));
    }

    return lines.join('\n');
  };

  const formatPhysicalFaceLabel = (face: string): string => {
    const value = face.trim();
    if (!value) return '';

    const graphemes = splitIntoGraphemes(value);
    if (graphemes.length === 1) return value;

    const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      const groupedParts = Array.from(parts.reduce((counts, part) => {
        counts.set(part, (counts.get(part) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())).map(([part, count]) => (
        count === 2
          ? `${truncateGraphemes(part, 4)}${truncateGraphemes(part, 4)}`
          : count >= 3
            ? `${truncateGraphemes(part, 7)}×${count}`
            : truncateGraphemes(part, 9)
      ));
      const visibleParts = groupedParts.slice(0, 3);
      if (groupedParts.length > 3) visibleParts[2] = `+${groupedParts.length - 2}`;
      return visibleParts.join('\n');
    }

    const repeatedSymbol = graphemes.length <= 3 && graphemes.every((grapheme) => grapheme === graphemes[0]);
    return repeatedSymbol ? value : balanceLabelLines(value);
  };

  // Check if a string is made up of repeated identical graphemes
  const expandRepeatedGraphemes = (str: string): string[] => {
    const graphemes = splitIntoGraphemes(str);
    if (graphemes.length <= 1) return [str];
    const first = graphemes[0];
    const allSame = graphemes.every(g => g === first);
    if (allSame) return graphemes;
    return [str];
  };

  // Parse a face value that may contain multiple values separated by ,
  const parseFaceValues = (face: string | number): (string | number)[] => {
    if (typeof face === 'number') return [face];
    const results: (string | number)[] = [];
    const parts = face.split(',').map(v => v.trim()).filter(v => v.length > 0);
    for (const part of parts) {
      if (isNumericString(part)) {
        results.push(part);
      } else {
        const expanded = expandRepeatedGraphemes(part);
        results.push(...expanded);
      }
    }
    return results;
  };

  // Aggregate roll results
  const aggregateResults = (allRolls: (number | string)[]): AggregatedResult[] => {
    const numericSum: number[] = [];
    const nonNumericCounts = new Map<string, number>();

    for (const roll of allRolls) {
      const values = parseFaceValues(roll);
      for (const val of values) {
        if (isNumericString(val)) {
          numericSum.push(typeof val === 'number' ? val : Number(val));
        } else {
          const key = String(val);
          nonNumericCounts.set(key, (nonNumericCounts.get(key) || 0) + 1);
        }
      }
    }

    const results: AggregatedResult[] = [];

    if (numericSum.length > 0) {
      const total = numericSum.reduce((a, b) => a + b, 0);
      results.push({
        value: String(total),
        count: numericSum.length,
        isNumeric: true,
        numericTotal: total
      });
    }

    const sortedNonNumeric = Array.from(nonNumericCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [value, count] of sortedNonNumeric) {
      results.push({
        value,
        count,
        isNumeric: false
      });
    }

    return results;
  };

  const addDieToPool = (die: number | CustomDie) => {
    if (isCustomDie(die)) {
      setDicePool(prev => [...prev, { faces: die.faces, id: nextId, customDieName: die.name }]);
    } else {
      setDicePool(prev => [...prev, { faces: die, id: nextId }]);
    }
    setNextId(prev => prev + 1);
    setResult(null);
    setLastRolledPool([]);
  };

  const clearPool = () => {
    setDicePool([]);
    setResult(null);
  };

  const rollPool = async (pool: DiceInPool[]) => {
    const physicalDice: PhysicalDieRequest[] = pool.flatMap((die) => {
      if (!Array.isArray(die.faces) && die.faces === 100) {
        return [{ faces: 10 }, { faces: 100, notation: 'd100' }];
      }

      const faces = Array.isArray(die.faces) ? die.faces.length : die.faces;
      if (!isPhysicalDieSupported(faces)) return [];

      return [{
        faces,
        labels: Array.isArray(die.faces)
          ? die.faces.map(formatPhysicalFaceLabel)
          : undefined,
      }];
    });

    const physicalValues = physicalDice.length > 0
      ? await rollPhysicalDice(physicalDice)
      : await new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 300));

    let physicalValueIndex = 0;
    const rolls: RollResultItem[] = [];
    const allRolls: (number | string)[] = [];

    for (const die of pool) {
      const faceCount = Array.isArray(die.faces) ? die.faces.length : die.faces;
      const isPercentileDie = !Array.isArray(die.faces) && die.faces === 100;
      const usesPhysicalDie = isPercentileDie || isPhysicalDieSupported(faceCount);
      let physicalValue: number | undefined;

      if (isPercentileDie) {
        const units = physicalValues?.[physicalValueIndex];
        const tens = physicalValues?.[physicalValueIndex + 1];
        if (units !== undefined && tens !== undefined) {
          physicalValue = (tens % 100) + (units % 10) || 100;
        }
        physicalValueIndex += 2;
      } else if (usesPhysicalDie) {
        physicalValue = physicalValues?.[physicalValueIndex];
        physicalValueIndex += 1;
      }

      const faceIndex = physicalValue !== undefined
        ? physicalValue - 1
        : Math.floor(Math.random() * faceCount);
      const roll = Array.isArray(die.faces)
        ? (die.faces[faceIndex] ?? '')
        : faceIndex + 1;

      rolls.push({ faces: die.faces, roll, customDieName: die.customDieName, id: die.id });
      allRolls.push(roll);
    }

    return { rolls, allRolls };
  };

  const rollDice = async () => {
    if (dicePool.length === 0 || isRolling) return;

    const pool = [...dicePool];
    setIsRolling(true);
    const { rolls, allRolls } = await rollPool(pool);

    const aggregated = aggregateResults(allRolls);
    const numericResult = aggregated.find(r => r.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + modifier : null;

    setResult({ dice: rolls, modifier, total, aggregatedResults: aggregated });
    setIsRolling(false);
    setLastRolledPool(pool);
    setDicePool([]);
    setNextId(1);
    trackGoatCounterEvent('roll-dice');

    const notation = buildPoolNotation(pool, modifier);
    const desc = total !== null ? `Rolled ${notation} = ${total}` : `Rolled ${notation}`;
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', desc, '🎲');
  };

  const rerollDice = async () => {
    if (lastRolledPool.length === 0 || isRolling) return;

    const pool = [...lastRolledPool];
    setDicePool(pool);
    setIsRolling(true);
    const { rolls, allRolls } = await rollPool(pool);

    const aggregated = aggregateResults(allRolls);
    const numericResult = aggregated.find(r => r.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + modifier : null;

    setResult({ dice: rolls, modifier, total, aggregatedResults: aggregated });
    setIsRolling(false);
    setDicePool([]);
    trackGoatCounterEvent('roll-dice');

    const rerollNotation = buildPoolNotation(pool, modifier);
    const rerollDesc = total !== null ? `Rerolled ${rerollNotation} = ${total}` : `Rerolled ${rerollNotation}`;
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', rerollDesc, '🎲');
  };

  // Re-roll a single die by its index in the result
  const rerollSingleDie = async (dieIndex: number) => {
    if (!result || isRolling || rerollingDieId !== null) return;
    
    const dieToReroll = result.dice[dieIndex];
    setRerollingDieId(dieToReroll.id);

    const { rolls } = await rollPool([{
      faces: dieToReroll.faces,
      id: dieToReroll.id,
      customDieName: dieToReroll.customDieName,
    }]);
    const newRoll = rolls[0].roll;

    const newDice = result.dice.map((die, index) =>
      index === dieIndex ? { ...die, roll: newRoll } : die
    );

    const allRolls = newDice.map(die => die.roll);
    const aggregated = aggregateResults(allRolls);
    const numericResult = aggregated.find(r => r.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + result.modifier : null;

    setResult({ dice: newDice, modifier: result.modifier, total, aggregatedResults: aggregated });
    trackGoatCounterEvent('roll-dice');

    const dieFacesLabel = Array.isArray(dieToReroll.faces)
      ? (dieToReroll.customDieName || 'custom')
      : `d${dieToReroll.faces}`;
    const desc = total !== null
      ? `Rerolled ${dieFacesLabel}: ${dieToReroll.roll} \u2192 ${newRoll} (total: ${total})`
      : `Rerolled ${dieFacesLabel}: ${dieToReroll.roll} \u2192 ${newRoll}`;
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', desc, '\ud83c\udfb2');

    setLastRolledPool(prev => prev.map((die, index) =>
      index === dieIndex ? { ...die } : die
    ));

    setRerollingDieId(null);
  };

  // Group dice in pool by type for display
  const buildPoolNotation = (pool: DiceInPool[] = dicePool, poolModifier: number = modifier) => {
    const standardDice: Record<number, number> = {};
    const customDice: Record<string, number> = {};
    
    for (const die of pool) {
      if (Array.isArray(die.faces)) {
        const name = die.customDieName || 'custom';
        customDice[name] = (customDice[name] || 0) + 1;
      } else {
        standardDice[die.faces] = (standardDice[die.faces] || 0) + 1;
      }
    }
    
    const parts: string[] = [];
    
    // Add standard dice (sorted by faces descending)
    Object.entries(standardDice)
      .sort(([a], [b]) => Number(b) - Number(a))
      .forEach(([faces, count]) => {
        parts.push(`${count}d${faces}`);
      });
    
    // Add custom dice
    Object.entries(customDice).forEach(([name, count]) => {
      parts.push(count > 1 ? `${count}× ${name}` : name);
    });
    
    let notation = parts.length > 0 ? parts.join(' + ') : 'Empty';
    if (poolModifier !== 0) {
      notation += poolModifier >= 0 ? ` + ${poolModifier}` : ` - ${Math.abs(poolModifier)}`;
    }
    return notation;
  };

  // Format the aggregated result for display
  const formatAggregatedResult = () => {
    if (!result) return '';

    const parts: string[] = [];
    
    for (const agg of result.aggregatedResults) {
      if (agg.isNumeric) {
        parts.push(String((agg.numericTotal || 0) + (result.modifier || 0)));
      } else {
        parts.push(`${agg.count}${agg.value}`);
      }
    }
    
    return parts.join(' | ');
  };

  // Check if result has any non-numeric values
  const hasNonNumericResults = result?.aggregatedResults.some(r => !r.isNumeric);

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}

      {/* Available Dice Buttons */}
      <div className="flex flex-wrap gap-1 justify-center flex-shrink-0">
        {(availableDice as (number | CustomDie)[]).map((die, index) => {
          if (isCustomDie(die)) {
            return (
              <Tooltip key={`custom-${die.name}-${index}`} content={`Add ${die.name} (${die.faces.length} faces: ${die.faces.slice(0, 3).join(', ')}${die.faces.length > 3 ? '...' : ''})` as string}>
                <button
                  onClick={() => addDieToPool(die)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!controlsVisible}
                  style={diceButtonStyle}
                  className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper min-w-[40px] font-body`}
                >
                  {die.name}
                </button>
              </Tooltip>
            );
          } else {
            return (
              <Tooltip key={`standard-${die}`} content={`Add d${die}`}>
                <button
                  onClick={() => addDieToPool(die)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!controlsVisible}
                  style={diceButtonStyle}
                  className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper min-w-[40px] font-body`}
                >
                  d{die}
                </button>
              </Tooltip>
            );
          }
        })}
      </div>

      {/* Roll and Clear Buttons */}
      <div className="flex gap-1 justify-center flex-shrink-0 mt-2">
          <Tooltip content={dicePool.length === 0 ? 'Add dice to the tray first' : `Roll ${buildPoolNotation()}`}>
            <button
              onClick={rollDice}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button flex-1 font-body ${
                isRolling
                  ? 'bg-theme-muted animate-pulse text-theme-paper cursor-not-allowed'
                  : dicePool.length === 0
                    ? 'bg-theme-paper text-theme-ink cursor-not-allowed'
                    : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
              }`}
              disabled={isRolling || dicePool.length === 0 || !controlsVisible}
            >
              {dicePool.length > 0 ? `Roll ${buildPoolNotation()}` : 'Roll'}
            </button>
          </Tooltip>
          {dicePool.length > 0 && (
            <Tooltip content="Remove all dice from the tray">
              <button
                onClick={clearPool}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!controlsVisible}
                className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500 rounded-button font-body`}
              >
                Clear
              </button>
            </Tooltip>
          )}
          {dicePool.length === 0 && lastRolledPool.length > 0 && (
            <Tooltip content="Reroll last dice">
              <button
                onClick={rerollDice}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper font-body`}
                disabled={isRolling || !controlsVisible}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </Tooltip>
          )}
      </div>

      {/* Result Display */}
      <div
        className="text-center flex-1 flex flex-col min-h-0 justify-center"
        onWheel={(e) => e.stopPropagation()}
      >
        {result && !isRolling ? (
          <>
            <div ref={resultSummaryRef} className="relative flex min-h-5 items-center justify-center">
              <div className={`${resultClass} font-bold text-theme-ink font-heading`}>
                {hasNonNumericResults ? formatAggregatedResult() : (result.total ?? '—')}
              </div>
              {controlsVisible && showTrayRollDetailsButton && (
                <Tooltip content={showTrayRollDetails ? 'Hide roll details' : 'Show roll details'}>
                  <button
                    type="button"
                    onClick={() => updateWidgetData(widget.id, { showTrayRollDetails: !showTrayRollDetails })}
                    onMouseDown={(event) => event.stopPropagation()}
                    aria-label={showTrayRollDetails ? 'Hide roll details' : 'Show roll details'}
                    aria-expanded={showTrayRollDetails}
                    className="absolute right-0 inline-flex h-5 w-5 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
                  >
                    {showTrayRollDetails ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                  </button>
                </Tooltip>
              )}
            </div>
            {/* Critical roll detection for single d20 (only for standard dice) */}
            {result.dice.length === 1 && 
             typeof result.dice[0].faces === 'number' && 
             result.dice[0].faces === 20 && (
              <>
                {result.dice[0].roll === 20 && (
                  <div className={`text-green-600 font-bold ${smallTextClass}`}>NAT 20!</div>
                )}
                {result.dice[0].roll === 1 && (
                  <div className={`text-red-600 font-bold ${smallTextClass}`}>NAT 1!</div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className={`${resultClass} font-bold text-theme-muted font-heading`}>—</div>
            <div className={`${smallTextClass} text-theme-muted font-body`}>&nbsp;</div>
          </>
        )}
      </div>
      {showTrayRollDetails && result && !isRolling && createPortal(
        <div
          id={`dice-tray-roll-details-${widget.id}`}
          ref={detailsDropdownRef}
          role="region"
          aria-label="Roll details"
          className="fixed z-[10020] max-w-[calc(100vw-16px)] overflow-y-auto rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper p-0.5 shadow-theme font-body animate-dropdown-in"
          style={{
            left: detailsPosition.left,
            top: detailsPosition.top,
            width: detailsPosition.width || undefined,
            maxHeight: detailsPosition.maxHeight || undefined,
          }}
          data-touch-camera-ignore="true"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mt-1 flex flex-col gap-0.5">
            {result.dice.map((d, i) => {
              const dieLabel = Array.isArray(d.faces)
                ? (d.customDieName || 'custom')
                : `d${d.faces}`;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-0 px-0 py-0.5 border-b border-theme-border/30 last:border-b-0"
                >
                  <span className="text-sm text-theme-muted font-body flex-shrink-0">{dieLabel}</span>
                  <span className="text-xl font-bold text-theme-ink font-heading flex-1 text-center truncate">
                    {String(d.roll)}
                  </span>
                  {controlsVisible ? <Tooltip content={`Re-roll ${dieLabel}`}>
                    <button
                      onClick={() => rerollSingleDie(i)}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={rerollingDieId !== null}
                      className={`p-0.5 rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex-shrink-0 ${
                        rerollingDieId === d.id ? 'animate-pulse bg-theme-accent text-theme-paper' : ''
                      }`}
                      aria-label={`Re-roll ${dieLabel} ${i + 1}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </Tooltip> : <span className="w-4 flex-shrink-0" />}
                </div>
              );
            })}
            {result.modifier !== 0 && (
              <div className="flex items-center justify-between gap-0 px-0 py-0.5">
                <span className="text-sm text-theme-muted font-body flex-shrink-0">modifier</span>
                <span className="text-xl font-bold text-theme-ink font-heading flex-1 text-center">
                  {result.modifier >= 0 ? `+${result.modifier}` : String(result.modifier)}
                </span>
                <span className="w-[18px] flex-shrink-0" />
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}






