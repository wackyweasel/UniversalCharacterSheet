import { useState } from 'react';
import { Widget, CustomDie } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
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
}

interface RollResult {
  dice: RollResultItem[];
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

export default function DiceTrayWidget({ widget }: Props) {
  const { label, availableDice = [4, 6, 8, 10, 12, 20], showIndividualResults = false } = widget.data;
  const [dicePool, setDicePool] = useState<DiceInPool[]>([]);
  const [lastRolledPool, setLastRolledPool] = useState<DiceInPool[]>([]);
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [nextId, setNextId] = useState(1);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const buttonClass = 'py-1 px-2 text-xs';
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

  const rollDice = () => {
    if (dicePool.length === 0) return;
    
    setIsRolling(true);
    
    setTimeout(() => {
      const rolls: RollResultItem[] = [];
      const allRolls: (number | string)[] = [];
      
      for (const die of dicePool) {
        if (Array.isArray(die.faces)) {
          // Custom die - roll from faces array
          const faceIndex = Math.floor(Math.random() * die.faces.length);
          const roll = die.faces[faceIndex];
          rolls.push({ faces: die.faces, roll, customDieName: die.customDieName });
          allRolls.push(roll);
        } else {
          // Standard die - roll 1 to faces
          const roll = Math.floor(Math.random() * die.faces) + 1;
          rolls.push({ faces: die.faces, roll });
          allRolls.push(roll);
        }
      }
      
      const aggregated = aggregateResults(allRolls);
      const numericResult = aggregated.find(r => r.isNumeric);
      const total = numericResult ? numericResult.numericTotal || 0 : null;
      
      setResult({ dice: rolls, total, aggregatedResults: aggregated });
      setIsRolling(false);
      setLastRolledPool([...dicePool]);
      setDicePool([]);
      setNextId(1);
    }, 300);
  };

  const rerollDice = () => {
    if (lastRolledPool.length === 0 || isRolling) return;
    setDicePool([...lastRolledPool]);
    // Use setTimeout to ensure state is updated before rolling
    setTimeout(() => {
      setIsRolling(true);
      setTimeout(() => {
        const rolls: RollResultItem[] = [];
        const allRolls: (number | string)[] = [];
        
        for (const die of lastRolledPool) {
          if (Array.isArray(die.faces)) {
            const faceIndex = Math.floor(Math.random() * die.faces.length);
            const roll = die.faces[faceIndex];
            rolls.push({ faces: die.faces, roll, customDieName: die.customDieName });
            allRolls.push(roll);
          } else {
            const roll = Math.floor(Math.random() * die.faces) + 1;
            rolls.push({ faces: die.faces, roll });
            allRolls.push(roll);
          }
        }
        
        const aggregated = aggregateResults(allRolls);
        const numericResult = aggregated.find(r => r.isNumeric);
        const total = numericResult ? numericResult.numericTotal || 0 : null;
        
        setResult({ dice: rolls, total, aggregatedResults: aggregated });
        setIsRolling(false);
        setDicePool([]);
      }, 300);
    }, 0);
  };

  // Group dice in pool by type for display
  const buildPoolNotation = () => {
    const standardDice: Record<number, number> = {};
    const customDice: Record<string, number> = {};
    
    for (const die of dicePool) {
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
    
    return parts.length > 0 ? parts.join(' + ') : 'Empty';
  };

  // Format the aggregated result for display
  const formatAggregatedResult = () => {
    if (!result) return '';
    
    // If showing individual results, display all dice separately
    if (showIndividualResults) {
      return result.dice.map(d => String(d.roll)).join(', ');
    }
    
    const parts: string[] = [];
    
    for (const agg of result.aggregatedResults) {
      if (agg.isNumeric) {
        parts.push(String(agg.numericTotal || 0));
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
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Available Dice Buttons */}
      <div className="flex flex-wrap gap-1 justify-center flex-shrink-0">
        {(availableDice as (number | CustomDie)[]).map((die, index) => {
          if (isCustomDie(die)) {
            return (
              <button
                key={`custom-${die.name}-${index}`}
                onClick={() => addDieToPool(die)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper min-w-[40px] font-body`}
                title={`Add ${die.name} (${die.faces.length} faces: ${die.faces.slice(0, 3).join(', ')}${die.faces.length > 3 ? '...' : ''})`}
              >
                {die.name}
              </button>
            );
          } else {
            return (
              <button
                key={`standard-${die}`}
                onClick={() => addDieToPool(die)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper min-w-[40px] font-body`}
                title={`Add d${die}`}
              >
                d{die}
              </button>
            );
          }
        })}
      </div>

      {/* Roll and Clear Buttons */}
      <div className="flex gap-1 justify-center flex-shrink-0 mt-2">
          <button
            onClick={rollDice}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button flex-1 font-body ${
              isRolling || dicePool.length === 0
                ? 'bg-theme-muted text-theme-paper cursor-not-allowed' 
                : 'bg-theme-accent text-theme-paper hover:opacity-90'
            }`}
            disabled={isRolling || dicePool.length === 0}
          >
            {dicePool.length > 0 ? `Roll ${buildPoolNotation()}` : 'Roll'}
          </button>
          {dicePool.length > 0 && (
            <button
              onClick={clearPool}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500 rounded-button font-body`}
            >
              Clear
            </button>
          )}
          {dicePool.length === 0 && lastRolledPool.length > 0 && (
            <button
              onClick={rerollDice}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper font-body`}
              title="Reroll last dice"
              disabled={isRolling}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
      </div>

      {/* Result Display */}
      <div className={`text-center flex-shrink-0`}>
        {result && !isRolling ? (
          <>
            {/* Show aggregated result for mixed/custom dice, or just total for standard */}
            <div className={`${resultClass} font-bold text-theme-ink font-heading`}>
              {showIndividualResults || hasNonNumericResults ? formatAggregatedResult() : (result.total ?? '—')}
            </div>
            {/* Only show individual rolls breakdown when not in showIndividualResults mode */}
            {!showIndividualResults && (
              <div className={`${smallTextClass} text-theme-muted font-body`}>
                {result.dice.map((d, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <span title={Array.isArray(d.faces) ? (d.customDieName || 'custom') : `d${d.faces}`}>
                      {d.roll}
                    </span>
                  </span>
                ))}
              </div>
            )}
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
    </div>
  );
}






