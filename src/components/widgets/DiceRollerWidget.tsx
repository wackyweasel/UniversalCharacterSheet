import { useState } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { Widget, DiceGroup } from '../../types';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { useDiceResult } from '../../hooks/useDiceResult';
import { ClearDiceResultButton } from '../ClearDiceResultButton';
import { Tooltip } from '../Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import { trackGoatCounterEvent } from '../../utils/goatCounter';
import { formatDiceExpression } from '../../utils/diceExpression';
import { resolveDiceExpressionField } from '../../utils/inlineDice';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { rollDiceTerms } from '../../utils/diceRoll';
import { showExpressionRoll } from '../../utils/showExpressionRoll';
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

const MAX_EXPLOSION_ROLLS = 100;

export default function DiceRollerWidget({ widget, mode, interactive = true }: Props) {
  const {
    label,
    diceGroups = [{ count: 1, faces: 20 }],
    modifier = 0,
  } = widget.data;
  const useExpression = widget.data.diceUseExpression === true;
  const diceExpressionText = widget.data.diceExpression ?? '';
  const formulaLabels = useFormulaLabels(useExpression && /[@{]/.test(diceExpressionText));
  const expressionTerms = useExpression ? resolveDiceExpressionField(diceExpressionText, formulaLabels).terms ?? null : null;
  const [isRolling, setIsRolling] = useState(false);
  const controlsVisible = interactive && mode !== 'print';
  const overlayResults = widget.data.diceResultOverlay === true;
  const { show: showOutput, close: closeResult, hasResult, panel: resultPanel } = useDiceResult(widget.id, overlayResults, mode === 'print');
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
  const buttonClass = 'py-1 px-2 text-xs';
  const gapClass = 'gap-1';

  const rollDice = async () => {
    if (isAttackDiceRoller && isCurrentTutorialStep('automation-roll-dice')) {
      advanceTutorial();
    }

    setIsRolling(true);

    if (useExpression) {
      if (!expressionTerms) {
        setIsRolling(false);
        return;
      }
      const expressionResult = await rollDiceTerms(expressionTerms);
      setIsRolling(false);
      const describeRoll = (verb: string, next: typeof expressionResult) => (
        `${verb} ${buildDiceNotation()} = ${next.total + modifier}`
      );
      showExpressionRoll({
        show: showOutput,
        title: label || 'Dice Roller',
        subtitle: buildDiceNotation(),
        result: expressionResult,
        modifier,
        onReroll: (next) => addTimelineEvent(label || 'Dice Roller', 'DICE_ROLLER', describeRoll('Rerolled', next), '🎲'),
      });
      addTimelineEvent(label || 'Dice Roller', 'DICE_ROLLER', describeRoll('Rolled', expressionResult), '🎲');
      return;
    }
    
    const physicalDice = (diceGroups as DiceGroup[]).flatMap((group) => {
      const diceCount = Math.max(0, Math.floor(Number(group.count) || 0));
      return Array.from({ length: diceCount }, () => getPhysicalDiceRequests(group)).flat();
    });
    const physicalValues = physicalDice.length > 0
      ? await rollPhysicalDice(physicalDice)
      : await new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 300));

    let physicalValueIndex = 0;
    const groups: RollGroupResult[] = [];

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

    const next = buildGroupsResult(groups, modifier, groups.flatMap((g) => g.diceRolls.map(() => 0)), 0);
    setIsRolling(false);
    showGroupsResult(next);
    trackGoatCounterEvent('roll-dice');

    // Timeline event
    const notation = buildDiceNotation();
    const desc = next.total !== null ? `Rolled ${notation} = ${next.total}` : `Rolled ${notation}`;
    addTimelineEvent(label || 'Dice Roller', 'DICE_ROLLER', desc, '🎲');
  };

  const buildGroupsResult = (
    groups: RollGroupResult[],
    resultModifier: number,
    versions: number[],
    rerollCount: number,
  ): RollResult => {
    const aggregated = aggregateResults(groups.flatMap((group) => group.rolls));
    const numericResult = aggregated.find((entry) => entry.isNumeric);
    const total = numericResult ? (numericResult.numericTotal || 0) + resultModifier : null;
    return { groups, modifier: resultModifier, total, aggregatedResults: aggregated, versions, rerollCount };
  };

  const formatAggregatedResult = (result: RollResult) => result.aggregatedResults
    .map((agg) => (agg.isNumeric ? String((agg.numericTotal || 0) + (result.modifier || 0)) : `${agg.count}${agg.value}`))
    .join(' | ');

  const showGroupsResult = (result: RollResult) => {
    const dice = result.groups.flatMap((group, groupIndex) => group.diceRolls.map((rolls) => ({ group, groupIndex, rolls })));
    const view: DiceResultView = {
      title: label || 'Dice Roller',
      subtitle: buildDiceNotation(),
      dice: dice.map(({ group, groupIndex, rolls }, index) => ({
        value: rolls.map(String).join(' → '),
        faces: group.faces,
        title: group.customFaces && group.customFaces.length > 0
          ? group.configuration.customDiceName || 'custom'
          : `d${group.faces}`,
        state: 'plain',
        groupStart: index > 0 && dice[index - 1].groupIndex !== groupIndex,
        version: result.versions[index] ?? 0,
      })),
      modifiers: result.modifier !== 0 ? [`${result.modifier < 0 ? '−' : '+'}${Math.abs(result.modifier)}`] : undefined,
      summary: formatAggregatedResult(result) || '—',
      kind: 'neutral',
    };

    // A lone d20 gets a critical callout.
    const only = result.groups.length === 1 && result.groups[0].rolls.length === 1 ? result.groups[0] : null;
    if (only && only.faces === 20 && !only.customFaces) {
      if (only.rolls[0] === 20) view.note = { text: 'NAT 20!', tone: 'good' };
      else if (only.rolls[0] === 1) view.note = { text: 'NAT 1!', tone: 'bad' };
    }

    showOutput({
      view,
      reroll: controlsVisible ? (indices) => rerollDice(result, indices) : undefined,
    });
  };

  const rerollDice = async (result: RollResult, indices: number[]) => {
    const flat = result.groups.flatMap((group, groupIndex) => group.diceRolls.map((_, dieIndex) => ({ groupIndex, dieIndex })));
    const targets = indices.map((index) => flat[index]).filter(Boolean);
    if (targets.length === 0) return;

    const physicalDice = targets.flatMap(({ groupIndex }) => getPhysicalDiceRequests(result.groups[groupIndex].configuration));
    const physicalValues = physicalDice.length > 0 ? await rollPhysicalDice(physicalDice) : null;

    let physicalValueIndex = 0;
    const diceRolls = result.groups.map((group) => [...group.diceRolls]);
    targets.forEach(({ groupIndex, dieIndex }) => {
      const configuration = result.groups[groupIndex].configuration;
      const { roll, consumedValues } = getPhysicalInitialRoll(configuration, physicalValues, physicalValueIndex);
      physicalValueIndex += consumedValues;
      diceRolls[groupIndex][dieIndex] = rollDieSequenceFromInitial(configuration, roll);
    });

    const groups = result.groups.map((group, groupIndex) => ({
      ...group,
      diceRolls: diceRolls[groupIndex],
      rolls: diceRolls[groupIndex].flat(),
    }));
    const rerollCount = result.rerollCount + 1;
    const versions = result.versions.map((version, index) => (indices.includes(index) ? rerollCount : version));
    const next = buildGroupsResult(groups, result.modifier, versions, rerollCount);
    showGroupsResult(next);
    trackGoatCounterEvent('roll-dice');

    const summary = next.total !== null ? `= ${next.total}` : `= ${formatAggregatedResult(next)}`;
    addTimelineEvent(
      label || 'Dice Roller',
      'DICE_ROLLER',
      `Re-rolled ${targets.length} ${targets.length === 1 ? 'die' : 'dice'} ${summary}`,
      '🎲',
    );
  };

  const buildDiceNotation = () => {
    if (useExpression) {
      let expressionNotation = expressionTerms ? formatDiceExpression(expressionTerms) : '';
      if (modifier !== 0) {
        expressionNotation += modifier >= 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
      }
      return expressionNotation;
    }
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

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate"><InlineFormulaText text={label} /></div>
        </div>
      )}

      {/* Roll Button */}
      <div className={`flex gap-1 ${overlayResults ? 'min-h-0 flex-1' : 'flex-shrink-0'}`}>
        <Tooltip content={`Roll ${diceNotation}`}>
          <button
            data-tutorial={isAttackDiceRoller ? 'automation-roll-dice' : undefined}
            onClick={rollDice}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} min-w-0 flex-1 border border-theme-border font-bold transition-all rounded-button font-body ${
              isRolling 
                ? 'bg-theme-muted animate-pulse text-theme-paper' 
                : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
            disabled={isRolling || !controlsVisible || (useExpression && !expressionTerms)}
          >
            {useExpression && !expressionTerms ? 'Set a dice expression' : `Roll ${diceNotation}`}
          </button>
        </Tooltip>
        {hasResult && <ClearDiceResultButton onClear={closeResult} />}
      </div>
      {resultPanel && (
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">{resultPanel}</div>
      )}
    </div>
  );
}




