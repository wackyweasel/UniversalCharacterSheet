import { useState } from 'react';
import { Widget, DiceGroup } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
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
}

interface RollGroupResult {
  faces: number;
  rolls: (number | string)[];
  diceRolls: (number | string)[][];
  customFaces?: string[];
  configuration: DiceGroup;
}

interface RollResult {
  groups: RollGroupResult[];
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

const MAX_EXPLOSION_ROLLS = 100;

export default function DiceRollerWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0, showRollDetails = false, showRollDetailsButton = true } = widget.data;
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const controlsVisible = interactive && mode !== 'print';
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;
  const isAttackDiceRoller = String(label || '').toLowerCase() === 'attack';

  // Check if a string is purely numeric
  const isNumericString = (val: string | number): boolean => {
    if (typeof val === 'number') return true;
    return !isNaN(Number(val)) && val.trim() !== '';
  };

  // Split a string into individual graphemes (handles emojis properly)
  const splitIntoGraphemes = (str: string): string[] => {
    // Use Intl.Segmenter if available for proper emoji splitting
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const SegmenterClass = (Intl as any).Segmenter;
      const segmenter = new SegmenterClass('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(str), (s: any) => s.segment);
    }
    // Fallback: use spread operator (works for most emojis)
    return [...str];
  };

  // Check if a string is made up of repeated identical graphemes (e.g., "📖📖" or "💀💀💀")
  const expandRepeatedGraphemes = (str: string): string[] => {
    const graphemes = splitIntoGraphemes(str);
    if (graphemes.length <= 1) return [str];
    
    // Check if all graphemes are the same
    const first = graphemes[0];
    const allSame = graphemes.every(g => g === first);
    
    if (allSame) {
      // Return array of individual graphemes
      return graphemes;
    }
    
    // Not all same, return original string as single item
    return [str];
  };

  // Parse a face value that may contain multiple values separated by ,
  // Also expands repeated emojis (e.g., "📖📖" becomes two "📖")
  const parseFaceValues = (face: string | number): (string | number)[] => {
    if (typeof face === 'number') return [face];
    
    const results: (string | number)[] = [];
    
    // Split by , to get multiple values from one face
    const parts = face.split(',').map(v => v.trim()).filter(v => v.length > 0);
    
    for (const part of parts) {
      if (isNumericString(part)) {
        results.push(part);
      } else {
        // Expand repeated graphemes (emojis/symbols)
        const expanded = expandRepeatedGraphemes(part);
        results.push(...expanded);
      }
    }
    
    return results;
  };

  const getFaceOptions = (group: DiceGroup): string[] => {
    if (group.customFaces && group.customFaces.length > 0) {
      return Array.from(new Set(group.customFaces.map(face => String(face))));
    }

    const faceCount = Math.max(1, Math.floor(Number(group.faces) || 1));
    return Array.from({ length: faceCount }, (_, i) => String(i + 1));
  };

  const getDefaultExplodeOn = (group: DiceGroup): string[] => {
    const options = getFaceOptions(group);
    if (options.length === 0 || !options.every(isNumericString)) return [];

    const maxFace = Math.max(...options.map(face => Number(face)));
    return options.filter(face => Number(face) === maxFace);
  };

  const getExplodeOn = (group: DiceGroup): string[] => {
    if (!group.explodes) return [];

    const options = getFaceOptions(group);
    const selected = Array.isArray(group.explodeOn)
      ? group.explodeOn.map(face => String(face))
      : getDefaultExplodeOn(group);

    return selected.filter(face => options.includes(face));
  };

  const rollSingleDie = (group: DiceGroup): number | string => {
    if (group.customFaces && group.customFaces.length > 0) {
      const faceIndex = Math.floor(Math.random() * group.customFaces.length);
      return group.customFaces[faceIndex];
    }

    const faceCount = Math.max(1, Math.floor(Number(group.faces) || 1));
    return Math.floor(Math.random() * faceCount) + 1;
  };

  const shouldExplode = (group: DiceGroup, roll: number | string): boolean => {
    const explodeOn = getExplodeOn(group);
    return explodeOn.length > 0 && explodeOn.includes(String(roll));
  };

  const rollDieSequence = (group: DiceGroup): (number | string)[] => {
    let roll = rollSingleDie(group);
    return rollDieSequenceFromInitial(group, roll);
  };

  const rollDieSequenceFromInitial = (group: DiceGroup, initialRoll: number | string): (number | string)[] => {
    const rolls: (number | string)[] = [];
    let roll = initialRoll;
    rolls.push(roll);

    const canExplodeAgain = group.explodeAgain ?? true;
    let explosionRolls = 0;

    while (shouldExplode(group, roll) && explosionRolls < MAX_EXPLOSION_ROLLS) {
      roll = rollSingleDie(group);
      rolls.push(roll);
      explosionRolls += 1;

      if (!canExplodeAgain) break;
    }

    return rolls;
  };

  const getPhysicalDiceRequests = (group: DiceGroup): PhysicalDieRequest[] => {
    if (group.customFaces && group.customFaces.length > 0) {
      return isPhysicalDieSupported(group.customFaces.length)
        ? [{ faces: group.customFaces.length, labels: group.customFaces.map(String) }]
        : [];
    }

    const faces = Math.max(1, Math.floor(Number(group.faces) || 1));
    if (faces === 100) return [{ faces: 10 }, { faces: 100, notation: 'd100' }];
    return isPhysicalDieSupported(faces) ? [{ faces }] : [];
  };

  const getPhysicalInitialRoll = (
    group: DiceGroup,
    values: number[] | null,
    valueIndex: number,
  ): { roll: number | string; consumedValues: number } => {
    const physicalRequests = getPhysicalDiceRequests(group);
    if (physicalRequests.length === 0 || !values) {
      return { roll: rollSingleDie(group), consumedValues: physicalRequests.length };
    }

    if (Number(group.faces) === 100 && !group.customFaces) {
      const units = values[valueIndex];
      const tens = values[valueIndex + 1];
      if (units !== undefined && tens !== undefined) {
        return { roll: (tens % 100) + (units % 10) || 100, consumedValues: 2 };
      }
      return { roll: rollSingleDie(group), consumedValues: 2 };
    }

    const physicalValue = values[valueIndex];
    if (physicalValue === undefined) {
      return { roll: rollSingleDie(group), consumedValues: 1 };
    }

    return {
      roll: group.customFaces?.[physicalValue - 1] ?? physicalValue,
      consumedValues: 1,
    };
  };

  // Aggregate roll results: sum numbers, count identical symbols/strings
  const aggregateResults = (allRolls: (number | string)[]): AggregatedResult[] => {
    const numericSum: number[] = [];
    const nonNumericCounts = new Map<string, number>();

    for (const roll of allRolls) {
      // Parse each roll - it may contain multiple values separated by |
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

    // Add numeric total first
    if (numericSum.length > 0) {
      const total = numericSum.reduce((a, b) => a + b, 0);
      results.push({
        value: String(total),
        count: numericSum.length,
        isNumeric: true,
        numericTotal: total
      });
    }

    // Add non-numeric results sorted by count (descending)
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

  // Fixed small sizing
  const labelClass = 'text-xs';
  const buttonClass = 'py-1 px-2 text-xs';
  const resultClass = 'text-xl';
  const smallTextClass = 'text-[10px]';
  const gapClass = 'gap-1';

  const rollDice = async () => {
    if (isAttackDiceRoller && isCurrentTutorialStep('automation-roll-dice')) {
      advanceTutorial();
    }

    setIsRolling(true);
    
    const physicalDice = (diceGroups as DiceGroup[]).flatMap((group) => {
      const diceCount = Math.max(0, Math.floor(Number(group.count) || 0));
      return Array.from({ length: diceCount }, () => getPhysicalDiceRequests(group)).flat();
    });
    const physicalValues = physicalDice.length > 0
      ? await rollPhysicalDice(physicalDice)
      : await new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 300));

    let physicalValueIndex = 0;
    const groups: RollGroupResult[] = [];
    const allRolls: (number | string)[] = [];

    for (const group of diceGroups as DiceGroup[]) {
      const rolls: (number | string)[] = [];
      const diceRolls: (number | string)[][] = [];
      const diceCount = Math.max(0, Math.floor(Number(group.count) || 0));

      for (let i = 0; i < diceCount; i++) {
        const { roll, consumedValues } = getPhysicalInitialRoll(group, physicalValues, physicalValueIndex);
        physicalValueIndex += consumedValues;
        const rollSequence = rollDieSequenceFromInitial(group, roll);
        diceRolls.push(rollSequence);
        rolls.push(...rollSequence);
        allRolls.push(...rollSequence);
      }

      groups.push({
        faces: group.customFaces?.length || group.faces,
        rolls,
        diceRolls,
        customFaces: group.customFaces,
        configuration: {
          ...group,
          customFaces: group.customFaces ? [...group.customFaces] : undefined,
          explodeOn: group.explodeOn ? [...group.explodeOn] : undefined,
        },
      });
    }

    const aggregated = aggregateResults(allRolls);
    const numericResult = aggregated.find(r => r.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + modifier : null;
    
    setResult({ groups, modifier, total, aggregatedResults: aggregated });
    setIsRolling(false);

    // Timeline event
    const notation = buildDiceNotation();
    const desc = total !== null ? `Rolled ${notation} = ${total}` : `Rolled ${notation}`;
    addTimelineEvent(label || 'Dice Roller', 'DICE_ROLLER', desc, '🎲');
  };

  const rerollDie = (groupIdx: number, dieIdx: number) => {
    if (!result) return;
    const group = result.groups[groupIdx];
    const newRollsForDie = rollDieSequence(group.configuration);

    const newGroups = result.groups.map((g, gi) => {
      if (gi !== groupIdx) return g;
      const diceRolls = g.diceRolls.map((rolls, index) => index === dieIdx ? newRollsForDie : rolls);
      return { ...g, diceRolls, rolls: diceRolls.flat() };
    });

    const allRolls: (number | string)[] = [];
    for (const g of newGroups) for (const r of g.rolls) allRolls.push(r);
    const aggregated = aggregateResults(allRolls);
    const numericResult = aggregated.find(r => r.isNumeric);
    const newTotal = numericResult ? (numericResult.numericTotal || 0) + result.modifier : null;

    setResult({ groups: newGroups, modifier: result.modifier, total: newTotal, aggregatedResults: aggregated });

    const dieName = group.customFaces && group.customFaces.length > 0
      ? group.configuration.customDiceName || 'custom'
      : `d${group.faces}`;
    addTimelineEvent(label || 'Dice Roller', 'DICE_ROLLER', `Re-rolled ${dieName}: ${newRollsForDie.join(' → ')}`, '🎲');
  };

  const buildDiceNotation = () => {
    const parts = (diceGroups as DiceGroup[]).map((g) => {
      let notation: string;
      if (g.customFaces && g.customFaces.length > 0) {
        const diceName = g.customDiceName || 'custom';
        notation = g.count > 1 ? `${g.count}× ${diceName}` : diceName;
      } else {
        notation = `${g.count}d${g.faces}`;
      }

      return g.explodes ? `${notation}!` : notation;
    });
    let notation = parts.join(' + ');
    if (modifier !== 0) {
      notation += modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
    }
    return notation;
  };

  const diceNotation = buildDiceNotation();

  // Format the aggregated result for display
  const formatAggregatedResult = () => {
    if (!result) return '';

    const parts: string[] = [];
    
    for (const agg of result.aggregatedResults) {
      if (agg.isNumeric) {
        // Add modifier to numeric total
        const withMod = (agg.numericTotal || 0) + (result.modifier || 0);
        parts.push(String(withMod));
      } else {
        parts.push(`${agg.count}${agg.value}`);
      }
    }
    
    return parts.join(' | ');
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Roll Button */}
      <Tooltip content={`Roll ${diceNotation}`}>
        <button
          data-tutorial={isAttackDiceRoller ? 'automation-roll-dice' : undefined}
          onClick={rollDice}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border font-bold transition-all rounded-button flex-shrink-0 font-body ${
            isRolling 
              ? 'bg-theme-muted animate-pulse text-theme-paper' 
              : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
          disabled={isRolling || !controlsVisible}
        >
          Roll {diceNotation}
        </button>
      </Tooltip>

      {/* Result Display - Always visible to maintain consistent height */}
      <div
        className={`text-center flex-1 flex flex-col min-h-0 overflow-y-auto ${showRollDetails ? 'justify-start' : 'justify-center'}`}
        onWheel={(e) => e.stopPropagation()}
      >
        {result && !isRolling ? (
          <>
            <div className="relative flex min-h-5 items-center justify-center">
              <div className={`${resultClass} font-bold text-theme-ink font-heading`}>
                {formatAggregatedResult() || '—'}
              </div>
              {controlsVisible && showRollDetailsButton && (
                <Tooltip content={showRollDetails ? 'Hide roll details' : 'Show roll details'}>
                  <button
                    type="button"
                    onClick={() => updateWidgetData(widget.id, { showRollDetails: !showRollDetails })}
                    onMouseDown={(event) => event.stopPropagation()}
                    aria-label={showRollDetails ? 'Hide roll details' : 'Show roll details'}
                    aria-expanded={showRollDetails}
                    className="absolute right-0 inline-flex h-5 w-5 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
                  >
                    {showRollDetails ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                  </button>
                </Tooltip>
              )}
            </div>
            {showRollDetails && (
              <div className="mt-1 flex flex-col gap-0.5">
                {result.groups.flatMap((g, gi) =>
                  g.diceRolls.map((rolls, dieIndex) => {
                  const dieLabel = g.customFaces && g.customFaces.length > 0
                      ? g.configuration.customDiceName || 'custom'
                    : `d${g.faces}`;
                  return (
                    <div
                      key={`${gi}-${dieIndex}`}
                      className="flex items-center justify-between gap-1 px-1 py-0.5 border-b border-theme-border/30 last:border-b-0"
                    >
                      <span className={`${smallTextClass} text-theme-muted font-body flex-shrink-0`}>{dieLabel}</span>
                      <span className={`text-base font-bold text-theme-ink font-heading flex-1 text-center truncate`}>
                        {rolls.map(String).join(' → ')}
                      </span>
                      {controlsVisible ? <Tooltip content={`Re-roll ${dieLabel}`}>
                        <button
                          onClick={() => rerollDie(gi, dieIndex)}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="p-0.5 rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex-shrink-0"
                          aria-label={`Re-roll ${dieLabel} ${dieIndex + 1}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </Tooltip> : <span className="w-4 flex-shrink-0" />}
                    </div>
                  );
                }))}
                {result.modifier !== 0 && (
                  <div className="flex items-center justify-between gap-1 px-1 py-0.5">
                    <span className={`${smallTextClass} text-theme-muted font-body flex-shrink-0`}>modifier</span>
                    <span className="flex-1 text-center font-heading text-base font-bold text-theme-ink">
                      {result.modifier >= 0 ? `+${result.modifier}` : String(result.modifier)}
                    </span>
                    <span className="w-4 flex-shrink-0" />
                  </div>
                )}
              </div>
            )}
            {/* Critical roll detection for single d20 (only for standard dice) */}
            {result.groups.length === 1 && 
             result.groups[0].rolls.length === 1 && 
             result.groups[0].faces === 20 && 
             !result.groups[0].customFaces && (
              <>
                {result.groups[0].rolls[0] === 20 && (
                  <div className={`text-green-600 font-bold ${smallTextClass}`}>NAT 20!</div>
                )}
                {result.groups[0].rolls[0] === 1 && (
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
    </div>
  );
}






