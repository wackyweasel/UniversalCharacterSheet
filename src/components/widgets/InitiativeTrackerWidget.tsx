import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Widget, InitiativeParticipant, InitiativeEncounterEntry } from '../../types';
import { useStore } from '../../store/useStore';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, MinusIcon, PauseIcon, PlayIcon, PlusIcon } from '../icons';
import { WidgetEmptyState } from './WidgetPrimitives';
import { AddMultipleToggle } from './StructureDialogControls';
import { trackGoatCounterEvent } from '../../utils/goatCounter';

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

function formatInitiativeDice(entry: InitiativeEncounterEntry): string {
  return entry.flatBonus === 0
    ? `d${entry.diceFaces}`
    : `d${entry.diceFaces}${entry.flatBonus > 0 ? '+' : ''}${entry.flatBonus}`;
}

function sortInitiativeEntries(entries: InitiativeEncounterEntry[]): InitiativeEncounterEntry[] {
  return [...entries].sort((a, b) => {
    if (a.rollResult === undefined || b.rollResult === undefined) {
      if (a.rollResult !== undefined) return -1;
      if (b.rollResult !== undefined) return 1;
      return 0;
    }
    if (b.rollResult !== a.rollResult) return b.rollResult - a.rollResult;
    if (b.flatBonus !== a.flatBonus) return b.flatBonus - a.flatBonus;
    return Math.random() - 0.5;
  });
}

interface AddParticipantModalProps {
  showRollButton: boolean;
  onClose: () => void;
  onAddPermanent: (name: string, diceFaces: number, flatBonus: number) => void;
  onAddTemporary: (name: string, diceFaces: number, flatBonus: number) => void;
}

function AddParticipantModal({
  showRollButton,
  onClose,
  onAddPermanent,
  onAddTemporary,
}: AddParticipantModalProps) {
  const [participantType, setParticipantType] = useState<'permanent' | 'temporary'>('permanent');
  const [name, setName] = useState('');
  const [diceFaces, setDiceFaces] = useState(20);
  const [flatBonus, setFlatBonus] = useState(0);
  const [addMultiple, setAddMultiple] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (participantType === 'permanent') {
      onAddPermanent(trimmedName, diceFaces, flatBonus);
    } else {
      onAddTemporary(trimmedName, diceFaces, flatBonus);
    }
    if (addMultiple) setName('');
    else onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="initiative-add-participant-title"
        className="bg-theme-paper border border-theme-border rounded-button shadow-xl p-4 min-w-[280px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="initiative-add-participant-title" className="font-bold text-theme-ink font-heading">Add participant</h3>
          <button
            onClick={onClose}
            aria-label="Close participant form"
            className="text-theme-muted hover:text-theme-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 rounded-button border border-theme-border p-0.5">
            <button
              type="button"
              onClick={() => setParticipantType('permanent')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${participantType === 'permanent' ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink hover:bg-theme-background'}`}
            >
              Permanent
            </button>
            <button
              type="button"
              onClick={() => setParticipantType('temporary')}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${participantType === 'temporary' ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink hover:bg-theme-background'}`}
            >
              Temporary
            </button>
          </div>

          <div>
            <label htmlFor="initiative-participant-name" className="block text-sm font-medium text-theme-ink mb-1">Name</label>
            <input
              id="initiative-participant-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
              autoFocus
            />
          </div>
          {showRollButton && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="initiative-participant-dice" className="block text-sm font-medium text-theme-ink mb-1">Dice faces</label>
                <input
                  id="initiative-participant-dice"
                  type="number"
                  min={1}
                  value={diceFaces}
                  onChange={(e) => setDiceFaces(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
                />
              </div>
              <div>
                <label htmlFor="initiative-participant-bonus" className="block text-sm font-medium text-theme-ink mb-1">Flat bonus</label>
                <input
                  id="initiative-participant-bonus"
                  type="number"
                  value={flatBonus}
                  onChange={(e) => setFlatBonus(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-theme-border rounded bg-theme-paper text-theme-ink"
                />
              </div>
            </div>
          )}
          <AddMultipleToggle
            checked={addMultiple}
            onChange={setAddMultiple}
            label="Add multiple participants"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper font-body"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
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

interface RemoveParticipantsModalProps {
  participants: InitiativeEncounterEntry[];
  onClose: () => void;
  onRemove: (ids: Set<string>) => void;
}

function RemoveParticipantsModal({ participants, onClose, onRemove }: RemoveParticipantsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleParticipant = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="initiative-remove-participants-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="initiative-remove-participants-title" className="font-heading text-base font-bold">Remove participants</h3>
        <p className="mt-3 text-sm text-theme-muted">Select one or more participants to remove.</p>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {participants.map((participant) => (
            <label
              key={participant.id}
              className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(participant.id)}
                onChange={() => toggleParticipant(participant.id)}
                className="h-4 w-4 flex-shrink-0 accent-theme-accent"
              />
              <span className="min-w-0 flex-1 truncate">{participant.name}</span>
              {participant.isTemporary && <span className="text-[10px] italic opacity-60">temporary</span>}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => onRemove(selectedIds)}
            disabled={selectedIds.size === 0}
            className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remove{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
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
    initiativeParticipantCardHeight = 28,
    initiativeShowRollButton = true,
    initiativeShowTimer = false,
    initiativeCurrentIndex = 0,
    initiativeAdvanceTimeTrackers = false,
    initiativeAdvanceByRound = true,
    initiativeAdvanceTimeAmount = 6,
    initiativeAdvanceTimeUnit = 'seconds'
  } = widget.data;
  const normalizedParticipantCardHeight = Math.max(16, Math.min(48, initiativeParticipantCardHeight));

  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showRemoveParticipantsModal, setShowRemoveParticipantsModal] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [timerSecondsByParticipant, setTimerSecondsByParticipant] = useState<Record<string, number>>({});
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const encounterListRef = useRef<HTMLDivElement>(null);
  const encounterEntryRefs = useRef(new Map<string, HTMLDivElement>());
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const encounterDragRef = useRef<{
    participantId: string;
    pointerId: number;
    cardElement: HTMLDivElement;
    startX: number;
    startY: number;
    startScrollTop: number;
    order: string[];
    slotRects: DOMRect[];
    startIndex: number;
    targetIndex: number;
    didMove: boolean;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  useEffect(() => {
    if (!initiativeShowTimer || !isTimerRunning) return;
    const activeParticipantId = initiativeEncounter[initiativeCurrentIndex]?.id;
    if (!activeParticipantId) return;
    const intervalId = window.setInterval(() => {
      setTimerSecondsByParticipant((secondsByParticipant) => ({
        ...secondsByParticipant,
        [activeParticipantId]: (secondsByParticipant[activeParticipantId] ?? 0) + 1,
      }));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [initiativeShowTimer, isTimerRunning, initiativeEncounter, initiativeCurrentIndex]);

  useEffect(() => {
    if (!initiativeShowTimer) {
      setTimerSecondsByParticipant({});
      setIsTimerRunning(false);
    }
  }, [initiativeShowTimer]);

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const moveToParticipant = (newIndex: number) => {
    const currentParticipantId = initiativeEncounter[initiativeCurrentIndex]?.id;
    const nextParticipantId = initiativeEncounter[newIndex]?.id;
    setTimerSecondsByParticipant((secondsByParticipant) => ({
      ...secondsByParticipant,
      ...(currentParticipantId && secondsByParticipant[currentParticipantId] === undefined
        ? { [currentParticipantId]: 0 }
        : {}),
      ...(nextParticipantId && secondsByParticipant[nextParticipantId] === undefined
        ? { [nextParticipantId]: 0 }
        : {}),
    }));
    setIsTimerRunning(initiativeShowTimer);
    updateWidgetData(widget.id, { initiativeCurrentIndex: newIndex });
  };

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

  const addPermanent = (name: string, diceFaces: number, flatBonus: number) => {
    const newParticipant: InitiativeParticipant = {
      name,
      diceFaces,
      flatBonus,
    };
    const newEntry: InitiativeEncounterEntry = {
      id: generateId(),
      name,
      diceFaces,
      flatBonus,
      isTemporary: false,
    };
    updateWidgetData(widget.id, {
      initiativePool: [...initiativePool, newParticipant],
      initiativeEncounter: [...initiativeEncounter, newEntry]
    });
  };

  const clearTemporaryParticipants = () => {
    const activeParticipantId = initiativeEncounter[initiativeCurrentIndex]?.id;
    const updated = initiativeEncounter.filter((entry: InitiativeEncounterEntry) => !entry.isTemporary);
    const activeParticipantIndex = updated.findIndex((entry: InitiativeEncounterEntry) => entry.id === activeParticipantId);
    updateWidgetData(widget.id, {
      initiativeEncounter: updated,
      initiativeCurrentIndex: activeParticipantIndex >= 0
        ? activeParticipantIndex
        : Math.min(initiativeCurrentIndex, Math.max(0, updated.length - 1)),
    });
  };

  const removeParticipants = (ids: Set<string>) => {
    if (ids.size === 0) return;
    const activeParticipantId = initiativeEncounter[initiativeCurrentIndex]?.id;
    const updated = initiativeEncounter.filter((entry: InitiativeEncounterEntry) => !ids.has(entry.id));
    const activeParticipantIndex = updated.findIndex((entry: InitiativeEncounterEntry) => entry.id === activeParticipantId);
    updateWidgetData(widget.id, {
      initiativeEncounter: updated,
      initiativeCurrentIndex: activeParticipantIndex >= 0 ? activeParticipantIndex : Math.min(initiativeCurrentIndex, Math.max(0, updated.length - 1)),
    });
    setShowRemoveParticipantsModal(false);
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

      const sorted = sortInitiativeEntries(rolled);

      updateWidgetData(widget.id, {
        initiativeEncounter: sorted,
        initiativeCurrentIndex: 0
      });
      trackGoatCounterEvent('roll-dice');
      
      setIsRolling(false);
    }, 300);
  }, [initiativeEncounter, widget.id, updateWidgetData]);

  const rollParticipant = (participantId: string) => {
    const activeParticipantId = initiativeEncounter[initiativeCurrentIndex]?.id;
    const rolled = initiativeEncounter.map((entry: InitiativeEncounterEntry) => {
      if (entry.id !== participantId) return entry;
      const dieRoll = Math.floor(Math.random() * entry.diceFaces) + 1;
      return { ...entry, rollResult: dieRoll + entry.flatBonus };
    });
    const sorted = sortInitiativeEntries(rolled);
    const activeParticipantIndex = sorted.findIndex((entry) => entry.id === activeParticipantId);

    updateWidgetData(widget.id, {
      initiativeEncounter: sorted,
      initiativeCurrentIndex: activeParticipantIndex >= 0 ? activeParticipantIndex : 0,
    });
    trackGoatCounterEvent('roll-dice');
  };

  // Navigate to next participant
  const goNext = () => {
    if (initiativeEncounter.length === 0) return;
    const newIndex = (initiativeCurrentIndex + 1) % initiativeEncounter.length;
    
    // If wrapping back to first participant, reset turn timers and advance time trackers.
    if (newIndex === 0) {
      setTimerSecondsByParticipant({});
      if (initiativeAdvanceTimeTrackers) {
        advanceTimeTrackers();
      }
    }
    
    moveToParticipant(newIndex);
  };

  // Navigate to previous participant
  const goBack = () => {
    if (initiativeEncounter.length === 0) return;
    const newIndex = initiativeCurrentIndex === 0 
      ? initiativeEncounter.length - 1 
      : initiativeCurrentIndex - 1;
    moveToParticipant(newIndex);
  };

  const reorderEncounter = (dragIdx: number, dropIndex: number) => {
    if (dragIdx === dropIndex || dragIdx < 0 || dropIndex < 0 || dropIndex >= initiativeEncounter.length) return;
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
  };

  const updateDragPreview = (drag: NonNullable<typeof encounterDragRef.current>, targetIndex: number) => {
    const previewOrder = drag.order.filter((id) => id !== drag.participantId);
    previewOrder.splice(targetIndex, 0, drag.participantId);

    previewOrder.forEach((id, previewIndex) => {
      if (id === drag.participantId) return;
      const originalIndex = drag.order.indexOf(id);
      const element = encounterEntryRefs.current.get(id);
      const originalRect = drag.slotRects[originalIndex];
      const previewRect = drag.slotRects[previewIndex];
      if (!element || !originalRect || !previewRect) return;
      const offsetY = (previewRect.top - originalRect.top) / drag.scaleY;
      if (Math.abs(offsetY) < 0.5) {
        element.classList.remove('initiative-entry--preview-shift');
        element.style.removeProperty('transform');
        return;
      }
      element.classList.add('initiative-entry--preview-shift');
      element.style.transform = `translate3d(0, ${offsetY}px, 0)`;
    });
  };

  const clearDragPreview = (drag: NonNullable<typeof encounterDragRef.current>) => {
    drag.order.forEach((id) => {
      const element = encounterEntryRefs.current.get(id);
      element?.classList.remove('initiative-entry--preview-shift');
      if (id !== drag.participantId) element?.style.removeProperty('transform');
    });
  };

  const finishEncounterDrag = (pointerId?: number, commit = true) => {
    const drag = encounterDragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
    if (drag) {
      drag.cardElement.classList.remove('initiative-entry--dragging');
      drag.cardElement.style.removeProperty('transform');
      clearDragPreview(drag);
      if (commit && drag.didMove) reorderEncounter(drag.startIndex, drag.targetIndex);
    }
    encounterDragRef.current = null;
  };

  const handleEncounterDragMove = (event: PointerEvent) => {
    const drag = encounterDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    event.preventDefault();
    if (!drag.didMove) {
      drag.didMove = true;
      drag.cardElement.classList.add('initiative-entry--dragging');
    }

    const list = encounterListRef.current;
    const scrollDelta = (list?.scrollTop ?? 0) - drag.startScrollTop;
    drag.cardElement.style.transform = `translate3d(${(event.clientX - drag.startX) / drag.scaleX}px, ${(event.clientY - drag.startY) / drag.scaleY + scrollDelta}px, 0) scale(1.025)`;

    const targetIndex = drag.slotRects.reduce((closestIndex, rect, index) => {
      const viewportScrollDelta = scrollDelta * drag.scaleY;
      const center = rect.top - viewportScrollDelta + rect.height / 2;
      const closestRect = drag.slotRects[closestIndex];
      const closestCenter = closestRect.top - viewportScrollDelta + closestRect.height / 2;
      return Math.abs(event.clientY - center) < Math.abs(event.clientY - closestCenter) ? index : closestIndex;
    }, drag.targetIndex);
    if (targetIndex === drag.targetIndex) return;
    drag.targetIndex = targetIndex;
    updateDragPreview(drag, targetIndex);
  };

  const startEncounterDrag = (participantId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (initiativeEncounter.length < 2 || event.button !== 0) return;
    const cardElement = encounterEntryRefs.current.get(participantId);
    if (!cardElement) return;
    const order = initiativeEncounter.map((entry: InitiativeEncounterEntry) => entry.id);
    const startIndex = order.indexOf(participantId);
    const slotRects = order.map((id) => encounterEntryRefs.current.get(id)?.getBoundingClientRect()).filter((rect): rect is DOMRect => Boolean(rect));
    if (startIndex < 0 || slotRects.length !== order.length) return;
    const cardRect = cardElement.getBoundingClientRect();
    const scaleX = cardElement.offsetWidth > 0 ? cardRect.width / cardElement.offsetWidth : 1;
    const scaleY = cardElement.offsetHeight > 0 ? cardRect.height / cardElement.offsetHeight : 1;

    removeDragListenersRef.current?.();
    encounterDragRef.current = {
      participantId,
      pointerId: event.pointerId,
      cardElement,
      startX: event.clientX,
      startY: event.clientY,
      startScrollTop: encounterListRef.current?.scrollTop ?? 0,
      order,
      slotRects,
      startIndex,
      targetIndex: startIndex,
      didMove: false,
      scaleX,
      scaleY,
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => handleEncounterDragMove(pointerEvent);
    const handlePointerUp = (pointerEvent: PointerEvent) => finishEncounterDrag(pointerEvent.pointerId);
    const handlePointerCancel = (pointerEvent: PointerEvent) => finishEncounterDrag(pointerEvent.pointerId, false);
    const handleWindowBlur = () => finishEncounterDrag(undefined, false);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handleWindowBlur);
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
    event.currentTarget.focus({ preventScroll: true });
  };

  useEffect(() => () => removeDragListenersRef.current?.(), []);

  const handleReorderKey = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    event.stopPropagation();
    reorderEncounter(index, Math.max(0, Math.min(initiativeEncounter.length - 1, index + offset)));
  };

  // Fixed sizing classes
  const itemClass = 'text-xs';
  const buttonClass = 'text-xs px-2 py-1';
  const hasTemporaryParticipants = initiativeEncounter.some((entry: InitiativeEncounterEntry) => entry.isTemporary);

  // Print mode: show only the ordered list
  if (isPrintMode) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {label && (
          <div className="widget-header mb-1 flex-shrink-0">
            <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
          </div>
        )}
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
                  <span className={`${itemClass} mr-1 text-theme-accent font-mono font-body`}>
                    {entry.rollResult ?? formatInitiativeDice(entry)}
                  </span>
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
      <div className="widget-structure-header mb-1 flex min-h-6 flex-shrink-0 items-center gap-2 pr-4">
        {label && (
          <div className="widget-structure-title min-w-0 flex-1 truncate">{label}</div>
        )}
        <div className="widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
          <Tooltip content={initiativeEncounter.length > 0 ? 'Choose participants to remove' : 'No participants to remove'}>
            <button
              type="button"
              onClick={() => setShowRemoveParticipantsModal(true)}
              onMouseDown={(event) => event.stopPropagation()}
              disabled={initiativeEncounter.length === 0}
              className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center disabled:opacity-35"
              aria-label="Choose initiative participants to remove"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Add a permanent or temporary participant">
            <button
              type="button"
              onClick={() => setShowAddParticipantModal(true)}
              onMouseDown={(event) => event.stopPropagation()}
              className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center"
              aria-label="Add initiative participant"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Encounter controls */}
      <div className="flex min-h-6 flex-wrap items-center gap-1 mb-2">
        {hasTemporaryParticipants && (
          <Tooltip content="Remove all temporary participants">
            <button
              type="button"
              onClick={clearTemporaryParticipants}
              className={`${buttonClass} widget-control widget-control--subtle`}
            >
              Clear temporary
            </button>
          </Tooltip>
        )}

        {/* Roll Initiative */}
        {initiativeShowRollButton && initiativeEncounter.length > 0 && (
          <Tooltip content="Roll initiative for all participants">
            <button
              onClick={rollInitiative}
              disabled={isRolling}
              className={`${buttonClass} widget-control font-bold ${
                isRolling ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isRolling ? '...' : 'Roll'}
            </button>
          </Tooltip>
        )}

        {initiativeShowTimer && initiativeEncounter.length > 0 && (
          <Tooltip content={isTimerRunning ? 'Pause turn timer' : 'Start turn timer'}>
            <button
              type="button"
              onClick={() => setIsTimerRunning((isRunning) => !isRunning)}
              className={`${buttonClass} widget-control flex h-[26px] w-7 items-center justify-center`}
              aria-label={isTimerRunning ? 'Pause turn timer' : 'Start turn timer'}
            >
              {isTimerRunning ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
            </button>
          </Tooltip>
        )}
      </div>

      {/* Encounter List */}
      <div ref={encounterListRef} className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
        {initiativeEncounter.length === 0 ? (
          <WidgetEmptyState
            title="No encounter yet"
            hint={mode === 'vertical'
              ? initiativePool.length > 0
                ? 'Reset to load the configured roster, or add a temporary participant.'
                : 'Add a temporary participant, or configure a roster in Build.'
              : undefined}
            compact={mode !== 'vertical'}
          />
        ) : (
          <div className="space-y-0.5">
            {initiativeEncounter.map((entry: InitiativeEncounterEntry, index: number) => (
              <div
                key={entry.id}
                ref={(element) => {
                  if (element) encounterEntryRefs.current.set(entry.id, element);
                  else encounterEntryRefs.current.delete(entry.id);
                }}
                className={`initiative-entry relative flex items-center gap-1 rounded-button border px-1 ${
                  index === initiativeCurrentIndex
                    ? 'border-theme-accent bg-theme-accent text-theme-paper'
                    : 'border-theme-border bg-theme-paper text-theme-ink hover:bg-theme-border/30'
                }`}
                style={{ height: `${normalizedParticipantCardHeight}px` }}
                aria-current={index === initiativeCurrentIndex ? 'true' : undefined}
              >
                {/* Drag Handle */}
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    startEncounterDrag(entry.id, event);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => handleReorderKey(index, event)}
                  className={`initiative-entry__drag-handle flex w-6 flex-shrink-0 touch-none select-none items-center justify-center rounded cursor-grab active:cursor-grabbing ${
                    index === initiativeCurrentIndex ? 'text-theme-paper/70' : 'text-theme-muted'
                  }`}
                  style={{ height: `${Math.min(24, Math.max(12, normalizedParticipantCardHeight - 2))}px` }}
                  aria-label={`Reorder ${entry.name}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon
                    style={{
                      width: `${Math.min(14, Math.max(10, normalizedParticipantCardHeight - 4))}px`,
                      height: `${Math.min(14, Math.max(10, normalizedParticipantCardHeight - 4))}px`,
                    }}
                  />
                </button>
                
                {/* Name */}
                <span className={`${itemClass} min-w-0 flex-1 truncate leading-none font-body`}>
                  {entry.name}
                </span>

                {initiativeShowTimer && (index === initiativeCurrentIndex || timerSecondsByParticipant[entry.id] !== undefined) && (
                  <span
                    className={`text-[10px] font-mono font-body tabular-nums ${
                      index === initiativeCurrentIndex ? 'text-theme-paper/65' : 'text-theme-muted'
                    }`}
                    aria-label={`Turn time ${formatTimer(timerSecondsByParticipant[entry.id] ?? 0)}`}
                  >
                    {formatTimer(timerSecondsByParticipant[entry.id] ?? 0)}
                  </span>
                )}

                {entry.isTemporary && (
                  <span className="text-[9px] italic leading-none opacity-60" title="Temporary participant">
                    temporary
                  </span>
                )}

                <Tooltip content={`${entry.rollResult === undefined ? 'Roll' : 'Reroll'} initiative for ${entry.name}`}>
                  <button
                    type="button"
                    onClick={() => rollParticipant(entry.id)}
                    className={`${itemClass} mr-1 min-w-[42px] text-right font-mono font-bold leading-none tabular-nums font-body underline-offset-2 hover:underline focus-visible:rounded`}
                    aria-label={`${entry.rollResult === undefined ? 'Roll' : 'Reroll'} initiative for ${entry.name}`}
                  >
                    {entry.rollResult ?? formatInitiativeDice(entry)}
                  </button>
                </Tooltip>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {initiativeEncounter.length > 0 && (
        <div className="flex gap-1 mt-1">
          <Tooltip content="Go to the previous participant">
            <button
              onClick={goBack}
              className={`${buttonClass} widget-control flex-1`}
            >
              ◀ Back
            </button>
          </Tooltip>
          <Tooltip content="Advance to the next participant">
            <button
              onClick={goNext}
              className={`${buttonClass} widget-control flex-1`}
            >
              Next ▶
            </button>
          </Tooltip>
        </div>
      )}

      {showAddParticipantModal && (
        <AddParticipantModal
          showRollButton={initiativeShowRollButton}
          onClose={() => setShowAddParticipantModal(false)}
          onAddPermanent={addPermanent}
          onAddTemporary={addTemporary}
        />
      )}
      {showRemoveParticipantsModal && (
        <RemoveParticipantsModal
          participants={initiativeEncounter as InitiativeEncounterEntry[]}
          onClose={() => setShowRemoveParticipantsModal(false)}
          onRemove={removeParticipants}
        />
      )}
    </div>
  );
}
