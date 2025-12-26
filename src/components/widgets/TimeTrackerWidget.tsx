import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, TimedEffect } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

// Modal component for forms
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-theme-paper border border-theme-border rounded-button shadow-xl p-4 min-w-[280px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-theme-ink font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
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

// Format time as rounds
function formatRounds(rounds: number): string {
  if (rounds <= 0) return 'Expired';
  return rounds === 1 ? '1 round' : `${rounds} rounds`;
}

export default function TimeTrackerWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, timedEffects = [], roundMode = false, effectSuggestions = [] } = widget.data;
  
  // UI state for expandable sections
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassTime, setShowPassTime] = useState(false);
  
  const [newEffectName, setNewEffectName] = useState('');
  const [newEffectTime, setNewEffectTime] = useState(1);
  const [newEffectUnit, setNewEffectUnit] = useState('minutes');
  
  const [passedTime, setPassedTime] = useState(1);
  const [passedUnit, setPassedUnit] = useState('minutes');

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const buttonClass = 'text-xs px-2 py-1';
  const gapClass = 'gap-1';

  const confirmAddEffect = () => {
    if (newEffectName.trim()) {
      // In round mode, store the number of rounds directly (using remainingSeconds field)
      // In normal mode, convert time to seconds
      const duration = roundMode ? newEffectTime : parseTimeToSeconds(newEffectTime, newEffectUnit);
      const newEffect: TimedEffect = {
        name: newEffectName.trim(),
        remainingSeconds: duration,
        initialSeconds: duration
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
    // In round mode, pass exactly 1 round
    // In normal mode, use the selected time
    const amountToPass = roundMode ? 1 : parseTimeToSeconds(passedTime, passedUnit);
    const updated = (timedEffects as TimedEffect[]).map(effect => ({
      ...effect,
      remainingSeconds: Math.max(0, effect.remainingSeconds - amountToPass)
    }));
    updateWidgetData(widget.id, { timedEffects: updated });
    setShowPassTime(false);
  };

  // In round mode, pass a round directly without modal
  const passRound = () => {
    const updated = (timedEffects as TimedEffect[]).map(effect => ({
      ...effect,
      remainingSeconds: Math.max(0, effect.remainingSeconds - 1)
    }));
    updateWidgetData(widget.id, { timedEffects: updated });
  };

  const cancelPassTime = () => {
    setPassedTime(1);
    setShowPassTime(false);
  };

  // Calculate effects list height based on available space
  const labelHeight = 16;
  const buttonsHeight = 32;
  const gapSize = 4;
  const padding = 0;
  const effectsListHeight = Math.max(60, height - labelHeight - buttonsHeight - gapSize * 3 - padding * 2);

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Effects List - Dynamic height, scrollable */}
      <div 
        className={`space-y-1 overflow-y-auto flex-1 ${itemClass}`}
        style={{ maxHeight: `${effectsListHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(timedEffects as TimedEffect[]).map((effect, idx) => (
          <div 
            key={idx} 
            className={`flex items-center gap-2 px-2 py-1 rounded-button border ${
              effect.remainingSeconds <= 0 
                ? 'bg-theme-accent/20 border-theme-accent animate-pulse' 
                : 'bg-theme-paper/50 border-theme-border'
            }`}
          >
            <span className={`flex-1 min-w-0 truncate font-medium text-xs ${effect.remainingSeconds <= 0 ? 'text-theme-accent' : 'text-theme-ink'}`}>
              {effect.name}
            </span>
            <span className={`flex-shrink-0 text-xs ${effect.remainingSeconds <= 0 ? 'text-theme-accent font-bold' : 'text-theme-muted'}`}>
              {roundMode ? formatRounds(effect.remainingSeconds) : formatTime(effect.remainingSeconds)}
            </span>
            <button 
              onClick={() => {
                const updated = [...timedEffects];
                updated[idx] = { ...effect, remainingSeconds: effect.initialSeconds ?? effect.remainingSeconds };
                updateWidgetData(widget.id, { timedEffects: updated });
              }}
              className="flex-shrink-0 px-2 py-0.5 text-xs border border-theme-border rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              title="Reset to initial duration"
            >
              ↺
            </button>
            <button 
              onClick={() => removeEffect(idx)}
              className="flex-shrink-0 px-2 py-0.5 text-xs border border-red-500/50 rounded-button bg-theme-paper text-red-500 hover:bg-red-500 hover:text-white transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              title="Remove effect"
            >
              ×
            </button>
          </div>
        ))}
        {timedEffects.length === 0 && !showAddForm && (
          <div className="text-theme-muted italic text-center py-2">No active effects</div>
        )}
      </div>

      {/* Action Buttons Row - Always visible */}
      <div className={`flex ${gapClass} border-t border-theme-border/50 pt-2 flex-shrink-0`}>
        <button
          onClick={() => setShowAddForm(true)}
          className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          + Add Effect
        </button>
        {timedEffects.length > 0 && (
          roundMode ? (
            <button
              onClick={passRound}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ⏱ Pass Round
            </button>
          ) : (
            <button
              onClick={() => setShowPassTime(true)}
              className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors font-bold`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ⏱ Pass Time
            </button>
          )
        )}
      </div>

      {/* Add Effect Modal */}
      {showAddForm && (
        <Modal title="Add Effect" onClose={cancelAddEffect}>
          <div className="space-y-3">
            {/* Suggestions as clickable chips */}
            {effectSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {effectSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="px-2 py-1 text-xs bg-theme-border/30 text-theme-ink rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors"
                    onClick={() => setNewEffectName(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <input
              className="w-full border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button"
              value={newEffectName}
              onChange={(e) => setNewEffectName(e.target.value)}
              placeholder="Effect name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddEffect();
                if (e.key === 'Escape') cancelAddEffect();
              }}
            />
            {roundMode ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="1"
                  className="w-20 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button text-center"
                  value={newEffectTime}
                  onChange={(e) => setNewEffectTime(e.target.value === '' ? '' as unknown as number : parseInt(e.target.value) || 1)}
                  onBlur={(e) => setNewEffectTime(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span className="text-theme-ink">{newEffectTime === 1 ? 'round' : 'rounds'}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  className="w-20 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button text-center"
                  value={newEffectTime}
                  onChange={(e) => setNewEffectTime(e.target.value === '' ? '' as unknown as number : parseInt(e.target.value) || 1)}
                  onBlur={(e) => setNewEffectTime(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <select
                  className="flex-1 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button"
                  value={newEffectUnit}
                  onChange={(e) => setNewEffectUnit(e.target.value)}
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmAddEffect}
                className="flex-1 py-2 px-4 bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-colors font-bold"
              >
                Add Effect
              </button>
              <button
                onClick={cancelAddEffect}
                className="flex-1 py-2 px-4 border border-theme-border text-theme-muted rounded-button hover:bg-theme-border hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pass Time Modal */}
      {showPassTime && (
        <Modal title="Pass Time" onClose={cancelPassTime}>
          <div className="space-y-3">
            <p className="text-theme-muted text-sm">How much time passes for all effects?</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="w-20 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button text-center"
                value={passedTime}
                onChange={(e) => setPassedTime(e.target.value === '' ? '' as unknown as number : parseInt(e.target.value) || 1)}
                onBlur={(e) => setPassedTime(Math.max(1, parseInt(e.target.value) || 1))}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmPassTime();
                  if (e.key === 'Escape') cancelPassTime();
                }}
              />
              <select
                className="flex-1 border border-theme-border focus:border-theme-accent focus:outline-none py-2 px-3 bg-theme-paper text-theme-ink font-body rounded-button"
                value={passedUnit}
                onChange={(e) => setPassedUnit(e.target.value)}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={confirmPassTime}
                className="flex-1 py-2 px-4 bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-colors font-bold"
              >
                Confirm
              </button>
              <button
                onClick={cancelPassTime}
                className="flex-1 py-2 px-4 border border-theme-border text-theme-muted rounded-button hover:bg-theme-border hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}






