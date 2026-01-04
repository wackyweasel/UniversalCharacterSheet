import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Widget, InitiativeParticipant, InitiativeEncounterEntry } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Generate a unique ID for encounter entries
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Modal component for adding temporary participants
interface AddTempModalProps {
  showRollButton: boolean;
  onClose: () => void;
  onAdd: (name: string, diceFaces: number, flatBonus: number) => void;
}

function AddTempModal({ showRollButton, onClose, onAdd }: AddTempModalProps) {
  const [name, setName] = useState('');
  const [diceFaces, setDiceFaces] = useState(20);
  const [flatBonus, setFlatBonus] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), diceFaces, flatBonus);
      onClose();
    }
  };

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
          <h3 className="font-bold text-theme-ink font-heading">Add Temporary Participant</h3>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-theme-ink mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
              autoFocus
            />
          </div>
          {showRollButton && (
            <>
              <div>
                <label className="block text-sm font-medium text-theme-ink mb-1">Dice Faces (e.g., 20 for d20)</label>
                <input
                  type="number"
                  min={1}
                  value={diceFaces}
                  onChange={(e) => setDiceFaces(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-ink mb-1">Flat Bonus</label>
                <input
                  type="number"
                  value={flatBonus}
                  onChange={(e) => setFlatBonus(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink hover:bg-theme-background font-body"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-theme-accent text-theme-paper rounded hover:opacity-90 font-body"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function InitiativeTrackerWidget({ widget }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  
  const { 
    label,
    initiativePool = [],
    initiativeEncounter = [],
    initiativeShowRollButton = true,
    initiativeCurrentIndex = 0,
    initiativeAdvanceTimeTrackers = false,
    initiativeAdvanceByRound = true,
    initiativeAdvanceTimeAmount = 6,
    initiativeAdvanceTimeUnit = 'seconds'
  } = widget.data;

  const [showAddTempModal, setShowAddTempModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Convert time units to seconds
  const timeToSeconds = (amount: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return amount;
      case 'minutes': return amount * 60;
      case 'hours': return amount * 60 * 60;
      case 'days': return amount * 24 * 60 * 60;
      default: return amount;
    }
  };

  // Advance all Time Tracker widgets on the current sheet
  const advanceTimeTrackers = () => {
    const activeChar = characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return;
    
    const activeSheet = activeChar.sheets.find(s => s.id === activeChar.activeSheetId);
    if (!activeSheet) return;

    // Find all Time Tracker widgets
    const timeTrackers = activeSheet.widgets.filter(w => w.type === 'TIME_TRACKER');
    
    for (const tracker of timeTrackers) {
      const timedEffects = tracker.data.timedEffects || [];
      if (timedEffects.length === 0) continue;
      
      const isRoundMode = tracker.data.roundMode === true;
      let amountToPass = 0;
      
      if (isRoundMode && initiativeAdvanceByRound) {
        // Pass 1 round for round-mode trackers
        amountToPass = 1;
      }
      
      if (!isRoundMode && initiativeAdvanceTimeAmount > 0) {
        // Pass time for time-based trackers
        amountToPass = timeToSeconds(initiativeAdvanceTimeAmount, initiativeAdvanceTimeUnit);
      }
      
      if (amountToPass > 0) {
        const updatedEffects = timedEffects.map((effect: { name: string; remainingSeconds: number; initialSeconds?: number }) => ({
          ...effect,
          remainingSeconds: Math.max(0, effect.remainingSeconds - amountToPass)
        }));
        updateWidgetData(tracker.id, { timedEffects: updatedEffects });
      }
    }
  };

  // Add a temporary participant
  const addTemporary = (name: string, diceFaces: number, flatBonus: number) => {
    const newEntry: InitiativeEncounterEntry = {
      id: generateId(),
      name,
      diceFaces,
      flatBonus,
      isTemporary: true
    };
    updateWidgetData(widget.id, {
      initiativeEncounter: [...initiativeEncounter, newEntry]
    });
  };

  // Remove a participant from the encounter
  const removeFromEncounter = (id: string) => {
    const updated = initiativeEncounter.filter((e: InitiativeEncounterEntry) => e.id !== id);
    // Adjust current index if needed
    let newIndex = initiativeCurrentIndex;
    const removedIndex = initiativeEncounter.findIndex((e: InitiativeEncounterEntry) => e.id === id);
    if (removedIndex !== -1 && removedIndex <= initiativeCurrentIndex && initiativeCurrentIndex > 0) {
      newIndex = Math.max(0, initiativeCurrentIndex - 1);
    }
    if (updated.length === 0) {
      newIndex = 0;
    } else if (newIndex >= updated.length) {
      newIndex = updated.length - 1;
    }
    updateWidgetData(widget.id, {
      initiativeEncounter: updated,
      initiativeCurrentIndex: newIndex
    });
  };

  // Roll initiative for all participants
  const rollInitiative = useCallback(() => {
    setIsRolling(true);
    
    setTimeout(() => {
      // Roll for each participant
      const rolled = initiativeEncounter.map((entry: InitiativeEncounterEntry) => {
        const dieRoll = Math.floor(Math.random() * entry.diceFaces) + 1;
        return {
          ...entry,
          rollResult: dieRoll + entry.flatBonus
        };
      });

      // Sort by roll result (highest first)
      // Tie-breaker: highest flat bonus first, then random
      const sorted = [...rolled].sort((a, b) => {
        // First: compare by roll result
        if ((b.rollResult ?? 0) !== (a.rollResult ?? 0)) {
          return (b.rollResult ?? 0) - (a.rollResult ?? 0);
        }
        // Tie-breaker 1: higher flat bonus wins
        if (b.flatBonus !== a.flatBonus) {
          return b.flatBonus - a.flatBonus;
        }
        // Tie-breaker 2: random
        return Math.random() - 0.5;
      });

      updateWidgetData(widget.id, {
        initiativeEncounter: sorted,
        initiativeCurrentIndex: 0
      });
      
      setIsRolling(false);
    }, 300);
  }, [initiativeEncounter, widget.id, updateWidgetData]);

  // Navigate to next participant
  const goNext = () => {
    if (initiativeEncounter.length === 0) return;
    const newIndex = (initiativeCurrentIndex + 1) % initiativeEncounter.length;
    
    // If wrapping back to first participant, it's a new round - advance time trackers
    if (newIndex === 0 && initiativeAdvanceTimeTrackers) {
      advanceTimeTrackers();
    }
    
    updateWidgetData(widget.id, { initiativeCurrentIndex: newIndex });
  };

  // Navigate to previous participant
  const goBack = () => {
    if (initiativeEncounter.length === 0) return;
    const newIndex = initiativeCurrentIndex === 0 
      ? initiativeEncounter.length - 1 
      : initiativeCurrentIndex - 1;
    updateWidgetData(widget.id, { initiativeCurrentIndex: newIndex });
  };

  // Reset encounter to all pool participants with no rolled values
  const newEncounter = () => {
    const poolEntries: InitiativeEncounterEntry[] = initiativePool.map((p: InitiativeParticipant) => ({
      id: generateId(),
      name: p.name,
      diceFaces: p.diceFaces,
      flatBonus: p.flatBonus,
      isTemporary: false
    }));
    updateWidgetData(widget.id, {
      initiativeEncounter: poolEntries,
      initiativeCurrentIndex: 0
    });
  };

  // Drag and drop handlers for manual reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragIdx = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (isNaN(dragIdx) || dragIdx === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...initiativeEncounter];
    const [draggedItem] = updated.splice(dragIdx, 1);
    updated.splice(dropIndex, 0, draggedItem);
    
    // Adjust current index if the highlighted item moved
    let newCurrentIndex = initiativeCurrentIndex;
    if (dragIdx === initiativeCurrentIndex) {
      newCurrentIndex = dropIndex;
    } else if (dragIdx < initiativeCurrentIndex && dropIndex >= initiativeCurrentIndex) {
      newCurrentIndex = initiativeCurrentIndex - 1;
    } else if (dragIdx > initiativeCurrentIndex && dropIndex <= initiativeCurrentIndex) {
      newCurrentIndex = initiativeCurrentIndex + 1;
    }

    updateWidgetData(widget.id, {
      initiativeEncounter: updated,
      initiativeCurrentIndex: newCurrentIndex
    });
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Fixed sizing classes
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const buttonClass = 'text-xs px-2 py-1';

  // Print mode: show only the ordered list
  if (isPrintMode) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {label && <div className={`font-bold text-theme-ink mb-1 ${labelClass} font-heading truncate`}>{label}</div>}
        <div className="flex-1 overflow-hidden">
          {initiativeEncounter.length === 0 ? (
            <div className={`text-theme-muted italic ${itemClass}`}>No participants</div>
          ) : (
            <div className="space-y-0.5">
              {initiativeEncounter.map((entry: InitiativeEncounterEntry, index: number) => (
                <div 
                  key={entry.id}
                  className={`flex items-center gap-2 px-1 py-0.5 rounded ${
                    index === initiativeCurrentIndex ? 'bg-theme-accent/20 font-bold' : ''
                  }`}
                >
                  <span className={`${itemClass} text-theme-muted w-4 font-body`}>{index + 1}.</span>
                  <span className={`${itemClass} text-theme-ink flex-1 truncate font-body`}>{entry.name}</span>
                  {entry.rollResult !== undefined && (
                    <span className={`${itemClass} text-theme-accent font-mono font-body`}>{entry.rollResult}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Label */}
      {label && (
        <div className={`font-bold text-theme-ink mb-1 ${labelClass} font-heading truncate`}>{label}</div>
      )}

      {/* Controls - Add from pool, Add temporary, Roll Initiative */}
      <div className="flex flex-wrap gap-1 mb-2">
        {/* New Encounter - resets to all pool participants */}
        <button
          onClick={newEncounter}
          className={`${buttonClass} bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-opacity font-body`}
        >
          Reset
        </button>

        {/* Add Temporary */}
        <button
          onClick={() => setShowAddTempModal(true)}
          className={`${buttonClass} border border-theme-border text-theme-ink rounded-button hover:bg-theme-background transition-colors font-body`}
        >
          Add 
        </button>

        {/* Roll Initiative */}
        {initiativeShowRollButton && initiativeEncounter.length > 0 && (
          <button
            onClick={rollInitiative}
            disabled={isRolling}
            className={`${buttonClass} bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-opacity font-body ${
              isRolling ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isRolling ? '...' : 'Roll'}
          </button>
        )}
      </div>

      {/* Encounter List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {initiativeEncounter.length === 0 ? (
          <div className={`text-theme-muted italic ${itemClass} text-center py-2`}>
            Add participants to start
          </div>
        ) : (
          <div className="space-y-0.5">
            {initiativeEncounter.map((entry: InitiativeEncounterEntry, index: number) => (
              <div
                key={entry.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 px-1 py-0.5 rounded transition-colors ${
                  index === initiativeCurrentIndex 
                    ? 'bg-theme-accent text-theme-paper' 
                    : 'bg-theme-background text-theme-ink hover:bg-theme-border/30'
                } ${
                  dragOverIndex === index ? 'ring-2 ring-theme-accent' : ''
                } ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <span 
                  className={`${itemClass} cursor-grab active:cursor-grabbing select-none px-0.5 ${
                    index === initiativeCurrentIndex ? 'text-theme-paper/70' : 'text-theme-muted'
                  }`}
                >⠿</span>
                
                {/* Name */}
                <span className={`${itemClass} flex-1 truncate font-body ${entry.isTemporary ? 'italic' : ''}`}>
                  {entry.name}
                </span>

                {/* Roll Result */}
                {entry.rollResult !== undefined && (
                  <span className={`${itemClass} font-mono font-bold min-w-[24px] text-center font-body`}>
                    {entry.rollResult}
                  </span>
                )}

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromEncounter(entry.id);
                  }}
                  className={`${itemClass} hover:text-red-500 transition-colors px-1 font-body`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {initiativeEncounter.length > 0 && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-theme-border">
          <button
            onClick={goBack}
            className={`${buttonClass} flex-1 border border-theme-border text-theme-ink rounded-button hover:bg-theme-background transition-colors font-body`}
          >
            ◀ Back
          </button>
          <button
            onClick={goNext}
            className={`${buttonClass} flex-1 bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-opacity font-body`}
          >
            Next ▶
          </button>
        </div>
      )}

      {/* Add Temporary Modal */}
      {showAddTempModal && (
        <AddTempModal
          showRollButton={initiativeShowRollButton}
          onClose={() => setShowAddTempModal(false)}
          onAdd={addTemporary}
        />
      )}
    </div>
  );
}
