import { useState } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Widget, CustomDie } from '../../types';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useDiceResult } from '../../hooks/useDiceResult';
import { ClearDiceResultButton } from '../ClearDiceResultButton';
import { Tooltip } from '../Tooltip';
import { trackGoatCounterEvent } from '../../utils/goatCounter';
import type { DiceResultView } from '../../utils/diceResult';
import {
  isPhysicalDieSupported,
  rollPhysicalDice,
  type PhysicalDieRequest,
} from '../DicePhysicsOverlay';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
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
  /** Reroll number that last produced each die, to replay the pop animation on rerolled dice only. */
  versions: number[];
  rerollCount: number;
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

export default function DiceTrayWidget({ widget, mode, interactive = true }: Props) {
  const { label, availableDice = [4, 6, 8, 10, 12, 20], modifier = 0 } = widget.data;
  const diceButtonScale = Math.min(100, Math.max(50, widget.data.diceButtonScale ?? 100)) / 100;
  const [dicePool, setDicePool] = useState<DiceInPool[]>([]);
  const [lastRolledPool, setLastRolledPool] = useState<DiceInPool[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [nextId, setNextId] = useState(1);
  const controlsVisible = interactive && mode !== 'print';
  const { show: showOutput, close: closeResult, hasResult, panel: resultPanel } = useDiceResult(widget.id, widget.data.diceResultOverlay === true, mode === 'print');

  // Fixed small sizing
  const buttonClass = 'py-1 px-2 text-xs';
  const diceButtonStyle = {
    fontSize: `${0.75 * diceButtonScale}rem`,
    padding: `${0.25 * diceButtonScale}rem ${0.5 * diceButtonScale}rem`,
    minWidth: `${40 * diceButtonScale}px`,
  };
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
    closeResult();
    setLastRolledPool([]);
  };

  const clearPool = () => {
    setDicePool([]);
    closeResult();
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

  const buildResult = (rolls: RollResultItem[], resultModifier: number, versions: number[], rerollCount: number): RollResult => {
    const aggregated = aggregateResults(rolls.map((die) => die.roll));
    const numericResult = aggregated.find(r => r.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + resultModifier : null;
    return { dice: rolls, modifier: resultModifier, total, aggregatedResults: aggregated, versions, rerollCount };
  };

  const formatAggregatedResult = (result: RollResult) => result.aggregatedResults
    .map((agg) => (agg.isNumeric ? String((agg.numericTotal || 0) + (result.modifier || 0)) : `${agg.count}${agg.value}`))
    .join(' | ');

  const getDieLabel = (die: RollResultItem) => (Array.isArray(die.faces) ? (die.customDieName || 'custom') : `d${die.faces}`);

  const showTrayResult = (result: RollResult) => {
    const hasNonNumericResults = result.aggregatedResults.some(r => !r.isNumeric);
    const view: DiceResultView = {
      title: label || 'Dice Tray',
      subtitle: buildPoolNotation(
        result.dice.map(({ faces, id, customDieName }) => ({ faces, id, customDieName })),
        result.modifier,
      ),
      dice: result.dice.map((die, index) => ({
        value: String(die.roll),
        title: getDieLabel(die),
        faces: Array.isArray(die.faces) ? die.faces.length : die.faces,
        state: 'plain',
        version: result.versions[index] ?? 0,
      })),
      modifiers: result.modifier !== 0 ? [`${result.modifier < 0 ? '−' : '+'}${Math.abs(result.modifier)}`] : undefined,
      summary: hasNonNumericResults ? formatAggregatedResult(result) : String(result.total ?? '—'),
      kind: 'neutral',
    };

    // A lone d20 gets a critical callout.
    const only = result.dice.length === 1 ? result.dice[0] : null;
    if (only && only.faces === 20) {
      if (only.roll === 20) view.note = { text: 'NAT 20!', tone: 'good' };
      else if (only.roll === 1) view.note = { text: 'NAT 1!', tone: 'bad' };
    }

    showOutput({
      view,
      reroll: controlsVisible ? (indices) => rerollSelectedDice(result, indices) : undefined,
    });
  };

  const describeTotal = (result: RollResult) => (
    result.total !== null ? `= ${result.total}` : `= ${formatAggregatedResult(result)}`
  );

  const rollDice = async () => {
    if (dicePool.length === 0 || isRolling) return;

    const pool = [...dicePool];
    setIsRolling(true);
    const { rolls } = await rollPool(pool);

    const next = buildResult(rolls, modifier, rolls.map(() => 0), 0);
    setIsRolling(false);
    showTrayResult(next);
    setLastRolledPool(pool);
    setDicePool([]);
    setNextId(1);
    trackGoatCounterEvent('roll-dice');

    const notation = buildPoolNotation(pool, modifier);
    const desc = next.total !== null ? `Rolled ${notation} = ${next.total}` : `Rolled ${notation}`;
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', desc, '🎲');
  };

  const rerollDice = async () => {
    if (lastRolledPool.length === 0 || isRolling) return;

    const pool = [...lastRolledPool];
    setDicePool(pool);
    setIsRolling(true);
    const { rolls } = await rollPool(pool);

    const next = buildResult(rolls, modifier, rolls.map(() => 0), 0);
    setIsRolling(false);
    showTrayResult(next);
    setDicePool([]);
    trackGoatCounterEvent('roll-dice');

    const rerollNotation = buildPoolNotation(pool, modifier);
    const rerollDesc = next.total !== null ? `Rerolled ${rerollNotation} = ${next.total}` : `Rerolled ${rerollNotation}`;
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', rerollDesc, '🎲');
  };

  // Rerolls the dice picked in the result dialog
  const rerollSelectedDice = async (result: RollResult, indices: number[]) => {
    const targets = indices.filter((index) => result.dice[index]);
    if (targets.length === 0) return;

    const { rolls } = await rollPool(targets.map((index) => ({
      faces: result.dice[index].faces,
      id: result.dice[index].id,
      customDieName: result.dice[index].customDieName,
    })));

    const rerollCount = result.rerollCount + 1;
    const dice = result.dice.map((die, index) => {
      const position = targets.indexOf(index);
      return position >= 0 ? { ...die, roll: rolls[position].roll } : die;
    });
    const versions = result.versions.map((version, index) => (targets.includes(index) ? rerollCount : version));
    const next = buildResult(dice, result.modifier, versions, rerollCount);
    showTrayResult(next);
    trackGoatCounterEvent('roll-dice');

    const changes = targets
      .map((index, position) => `${getDieLabel(result.dice[index])}: ${result.dice[index].roll} \u2192 ${rolls[position].roll}`)
      .join(', ');
    addTimelineEvent(label || 'Dice Tray', 'DICE_TRAY', `Rerolled ${changes} (${describeTotal(next)})`, '\ud83c\udfb2');
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

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate"><InlineFormulaText text={label} /></div>
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
          {hasResult && <ClearDiceResultButton onClear={closeResult} />}
      </div>
      {resultPanel && (
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">{resultPanel}</div>
      )}
    </div>
  );
}





