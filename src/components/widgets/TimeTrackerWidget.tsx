import { useState } from 'react';
import { Widget, TimedEffect } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

// Convert seconds to a human-readable format
function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Expired';
  
  const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60));
  const months = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60));
  const days = Math.floor((totalSeconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}mo`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.slice(0, 3).join(' '); // Show max 3 units for readability
}

// Parse time input to seconds
function parseTimeToSeconds(value: number, unit: string): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours': return value * 60 * 60;
    case 'days': return value * 24 * 60 * 60;
    case 'months': return value * 30 * 24 * 60 * 60;
    case 'years': return value * 365 * 24 * 60 * 60;
    default: return value;
  }
}

export default function TimeTrackerWidget({ widget, width }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, timedEffects = [] } = widget.data;
  
  // UI state for expandable sections
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassTime, setShowPassTime] = useState(false);
  
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectTime, setNewEffectTime] = useState(1);
  const [newEffectUnit, setNewEffectUnit] = useState('minutes');
  
  const [passedTime, setPassedTime] = useState(1);
  const [passedUnit, setPassedUnit] = useState('minutes');

  // Responsive sizing
  const isCompact = width < 200;
  const isLarge = width >= 350;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-sm' : 'text-xs';
  const inputClass = isCompact ? 'text-xs py-0.5 px-1' : isLarge ? 'text-sm py-1.5 px-2' : 'text-xs py-1 px-1.5';
  const buttonClass = isCompact ? 'text-xs px-2 py-1' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const confirmAddEffect = () => {
    if (newEffectName.trim()) {
      const seconds = parseTimeToSeconds(newEffectTime, newEffectUnit);
      const newEffect: TimedEffect = {
        name: newEffectName.trim(),
        remainingSeconds: seconds
      };
      updateWidgetData(widget.id, { 
        timedEffects: [...timedEffects, newEffect] 
      });
      setNewEffectName('');
      setNewEffectTime(1);
      setShowAddForm(false);
    }
  };

  const cancelAddEffect = () => {
    setNewEffectName('');
    setNewEffectTime(1);
    setShowAddForm(false);
  };

  const removeEffect = (index: number) => {
    const updated = [...timedEffects];
    updated.splice(index, 1);
    updateWidgetData(widget.id, { timedEffects: updated });
  };

  const confirmPassTime = () => {
    const secondsToPass = parseTimeToSeconds(passedTime, passedUnit);
    const updated = (timedEffects as TimedEffect[]).map(effect => ({
      ...effect,
      remainingSeconds: Math.max(0, effect.remainingSeconds - secondsToPass)
    }));
    updateWidgetData(widget.id, { timedEffects: updated });
    setShowPassTime(false);
  };

  const cancelPassTime = () => {
    setPassedTime(1);
    setShowPassTime(false);
  };

  const clearExpired = () => {
    const updated = (timedEffects as TimedEffect[]).filter(effect => effect.remainingSeconds > 0);
    updateWidgetData(widget.id, { timedEffects: updated });
  };

  const hasExpired = (timedEffects as TimedEffect[]).some(e => e.remainingSeconds <= 0);

  // Fixed height for approximately 3 effects (each effect ~40px + spacing)
  const effectsListHeight = isCompact ? 'h-28' : isLarge ? 'h-36' : 'h-32';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Time Tracker'}
      </div>
      
      {/* Effects List - Fixed height, scrollable */}
      <div 
        className={`space-y-1 ${effectsListHeight} overflow-y-auto flex-shrink-0 ${itemClass}`}
        onWheel={(e) => e.stopPropagation()}
      >
        {(timedEffects as TimedEffect[]).map((effect, idx) => (
          <div 
            key={idx} 
            className={`flex justify-between items-center group p-1.5 rounded-theme border ${
              effect.remainingSeconds <= 0 
                ? 'bg-theme-accent/20 border-theme-accent animate-pulse' 
                : 'border-theme-border/30 hover:border-theme-border'
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className={`font-medium ${effect.remainingSeconds <= 0 ? 'text-theme-accent' : 'text-theme-ink'}`}>
                {effect.name}
              </span>
              <div className={`${effect.remainingSeconds <= 0 ? 'text-theme-accent font-bold' : 'text-theme-muted'}`}>
                {formatTime(effect.remainingSeconds)}
              </div>
            </div>
            <button 
              onClick={() => removeEffect(idx)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-1 flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </div>
        ))}
        {timedEffects.length === 0 && !showAddForm && (
          <div className="text-theme-muted italic text-center py-2">No active effects</div>
        )}
      </div>

      {/* Action Buttons Row */}
      {!showAddForm && !showPassTime && (
        <div className={`flex ${gapClass} border-t border-theme-border/50 pt-2`}>
          <button
            onClick={() => setShowAddForm(true)}
            className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            + Add Effect
          </button>
          {timedEffects.length > 0 && (
            <button
              onClick={() => setShowPassTime(true)}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ⏱ Pass Time
            </button>
          )}
        </div>
      )}

      {/* Add Effect Form (expandable) */}
      {showAddForm && (
        <div className={`flex flex-col ${gapClass} border-t border-theme-border/50 pt-2`}>
          <input
            className={`w-full border border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} bg-transparent text-theme-ink font-body rounded-theme`}
            value={newEffectName}
            onChange={(e) => setNewEffectName(e.target.value)}
            placeholder="Effect name..."
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAddEffect();
              if (e.key === 'Escape') cancelAddEffect();
            }}
          />
          <div className="flex gap-1">
            <input
              type="number"
              min="1"
              className={`w-16 border border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} bg-transparent text-theme-ink font-body rounded-theme text-center`}
              value={newEffectTime}
              onChange={(e) => setNewEffectTime(Math.max(1, parseInt(e.target.value) || 1))}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <select
              className={`flex-1 border border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} bg-theme-paper text-theme-ink font-body rounded-theme`}
              value={newEffectUnit}
              onChange={(e) => setNewEffectUnit(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmAddEffect}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✓ Add
            </button>
            <button
              onClick={cancelAddEffect}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-muted rounded-theme hover:bg-theme-border hover:text-theme-ink transition-colors`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pass Time Form (expandable) */}
      {showPassTime && (
        <div className={`flex flex-col ${gapClass} border-t border-theme-border/50 pt-2`}>
          <div className={`font-medium ${itemClass} text-theme-muted`}>How much time passes?</div>
          <div className="flex gap-1">
            <input
              type="number"
              min="1"
              className={`w-16 border border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} bg-transparent text-theme-ink font-body rounded-theme text-center`}
              value={passedTime}
              onChange={(e) => setPassedTime(Math.max(1, parseInt(e.target.value) || 1))}
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmPassTime();
                if (e.key === 'Escape') cancelPassTime();
              }}
            />
            <select
              className={`flex-1 border border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} bg-theme-paper text-theme-ink font-body rounded-theme`}
              value={passedUnit}
              onChange={(e) => setPassedUnit(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmPassTime}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✓ Confirm
            </button>
            <button
              onClick={cancelPassTime}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-muted rounded-theme hover:bg-theme-border hover:text-theme-ink transition-colors`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clear Expired Button */}
      {hasExpired && !showAddForm && !showPassTime && (
        <button
          onClick={clearExpired}
          className={`${buttonClass} border border-theme-accent text-theme-accent rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Clear Expired
        </button>
      )}
    </div>
  );
}
