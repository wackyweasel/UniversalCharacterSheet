import { useState } from 'react';
import { Widget, DiceGroup } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

interface RollGroupResult {
  faces: number;
  rolls: (number | string)[];
  customFaces?: string[];
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

export default function DiceRollerWidget({ widget }: Props) {
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0, showIndividualResults = false } = widget.data;
  const [result, setResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

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

  const rollDice = () => {
    setIsRolling(true);
    
    setTimeout(() => {
      const groups: RollGroupResult[] = [];
      const allRolls: (number | string)[] = [];
      
      for (const group of diceGroups as DiceGroup[]) {
        const rolls: (number | string)[] = [];
        
        if (group.customFaces && group.customFaces.length > 0) {
          // Roll custom faces
          for (let i = 0; i < group.count; i++) {
            const faceIndex = Math.floor(Math.random() * group.customFaces.length);
            const roll = group.customFaces[faceIndex];
            rolls.push(roll);
            allRolls.push(roll);
          }
          groups.push({ faces: group.customFaces.length, rolls, customFaces: group.customFaces });
        } else {
          // Roll standard numeric dice
          for (let i = 0; i < group.count; i++) {
            const roll = Math.floor(Math.random() * group.faces) + 1;
            rolls.push(roll);
            allRolls.push(roll);
          }
          groups.push({ faces: group.faces, rolls });
        }
      }

      const aggregated = aggregateResults(allRolls);
      const numericResult = aggregated.find(r => r.isNumeric);
      const total = numericResult ? (numericResult.numericTotal || 0) + modifier : null;
      
      setResult({ groups, modifier, total, aggregatedResults: aggregated });
      setIsRolling(false);
    }, 300);
  };

  const buildDiceNotation = () => {
    const parts = (diceGroups as DiceGroup[]).map((g) => {
      if (g.customFaces && g.customFaces.length > 0) {
        const diceName = g.customDiceName || 'custom';
        return g.count > 1 ? `${g.count}× ${diceName}` : diceName;
      }
      return `${g.count}d${g.faces}`;
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
    
    // If showing individual results, display all dice separately
    if (showIndividualResults) {
      const allRolls: string[] = [];
      for (const g of result.groups) {
        for (const roll of g.rolls) {
          allRolls.push(String(roll));
        }
      }
      // Add modifier at the end if non-zero
      if (result.modifier !== 0) {
        allRolls.push(result.modifier >= 0 ? `+${result.modifier}` : String(result.modifier));
      }
      return allRolls.join(', ');
    }
    
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
      <button
        onClick={rollDice}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button flex-shrink-0 ${
          isRolling 
            ? 'bg-theme-muted animate-pulse text-theme-paper' 
            : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
        }`}
        disabled={isRolling}
      >
        Roll {diceNotation}
      </button>

      {/* Result Display - Always visible to maintain consistent height */}
      <div className={`text-center border-t border-theme-border/50 pt-1 flex-1 flex flex-col justify-center`}>
        {result && !isRolling ? (
          <>
            {/* Show aggregated result (e.g., "17 | 2💀 | 3 poison") */}
            <div className={`${resultClass} font-bold text-theme-ink font-heading`}>
              {formatAggregatedResult() || '—'}
            </div>
            {/* Only show individual rolls breakdown when not in showIndividualResults mode */}
            {!showIndividualResults && (
              <div className={`${smallTextClass} text-theme-muted font-body`}>
                {result.groups.map((g, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <span title={g.customFaces ? `d[${g.customFaces.join(',')}]` : `d${g.faces}`}>
                      [{g.rolls.join(', ')}]
                    </span>
                  </span>
                ))}
                {result.modifier !== 0 && (
                  <span> {result.modifier >= 0 ? '+' : ''}{result.modifier}</span>
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






