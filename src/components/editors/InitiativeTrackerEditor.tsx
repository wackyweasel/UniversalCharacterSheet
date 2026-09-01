import React, { useState, useRef } from 'react';
import { InitiativeEncounterEntry, InitiativeParticipant } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, PencilIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

function generateEncounterId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

function parseNumberDraft(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntegerDraft(value: string, fallback: number): number {
  return Math.trunc(parseNumberDraft(value, fallback));
}

export function InitiativeTrackerEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    initiativePool = [], 
    initiativeParticipantCardHeight = 28,
    initiativeShowRollButton = true,
    initiativeShowTimer = false,
    initiativeAdvanceTimeTrackers = false,
    initiativeAdvanceByRound = true,
    initiativeAdvanceTimeAmount = 6,
    initiativeAdvanceTimeUnit = 'seconds'
  } = widget.data;
  const normalizedParticipantCardHeight = Math.max(16, Math.min(48, initiativeParticipantCardHeight));

  const [newName, setNewName] = useState('');
  const [newDiceFaces, setNewDiceFaces] = useState('20');
  const [newFlatBonus, setNewFlatBonus] = useState('0');
  const [newFlatBonusLabel, setNewFlatBonusLabel] = useState<string | undefined>(undefined);
  const [newFlatBonusFormula, setNewFlatBonusFormula] = useState<string | undefined>(undefined);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDiceFaces, setEditingDiceFaces] = useState('20');
  const [editingFlatBonus, setEditingFlatBonus] = useState('0');
  const [advanceTimeAmountDraft, setAdvanceTimeAmountDraft] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const initiativePoolList = initiativePool as InitiativeParticipant[];
  const participantIdsRef = useRef(new WeakMap<InitiativeParticipant, string>());
  const nextParticipantIdRef = useRef(0);
  const getParticipantId = (participant: InitiativeParticipant) => {
    const existingId = participantIdsRef.current.get(participant);
    if (existingId) return existingId;
    const id = `initiative-participant-${nextParticipantIdRef.current++}`;
    participantIdsRef.current.set(participant, id);
    return id;
  };
  const reorderableParticipants = initiativePoolList.map((participant) => ({
    id: getParticipantId(participant),
    item: participant,
  }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableParticipants,
    onReorder: (items) => updateData({ initiativePool: items.map(({ item }) => item) }),
  });

  const updateAdvanceTimeAmount = (rawValue: string) => {
    setAdvanceTimeAmountDraft(rawValue);
    if (rawValue !== '') {
      updateData({ initiativeAdvanceTimeAmount: Math.max(0, parseIntegerDraft(rawValue, 0)) });
    }
  };

  const commitAdvanceTimeAmount = () => {
    if (advanceTimeAmountDraft === null) return;
    const value = Math.max(0, parseIntegerDraft(advanceTimeAmountDraft, 0));
    setAdvanceTimeAmountDraft(null);
    updateData({ initiativeAdvanceTimeAmount: value });
  };

  const addParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const newParticipant: InitiativeParticipant = {
        name: newName.trim(),
        diceFaces: Math.max(1, parseIntegerDraft(newDiceFaces, 20)),
        flatBonus: parseNumberDraft(newFlatBonus, 0),
        flatBonusLabel: newFlatBonusLabel,
        flatBonusFormula: newFlatBonusFormula
      };
      const updatedPool = [...initiativePool, newParticipant] as InitiativeParticipant[];
      updateData({
        initiativePool: updatedPool,
        initiativeEncounter: [
          ...(widget.data.initiativeEncounter ?? []),
          {
            id: generateEncounterId(),
            name: newParticipant.name,
            diceFaces: newParticipant.diceFaces,
            flatBonus: newParticipant.flatBonus,
            isTemporary: false,
          } satisfies InitiativeEncounterEntry,
        ],
      });
      setNewName('');
      setNewDiceFaces('20');
      setNewFlatBonus('0');
      setNewFlatBonusLabel(undefined);
      setNewFlatBonusFormula(undefined);
    }
  };

  const removeParticipant = (index: number) => {
    const updated = [...initiativePoolList];
    updated.splice(index, 1);
    updateData({ initiativePool: updated });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    const participant = initiativePoolList[index];
    setEditingIndex(index);
    setEditingName(participant.name);
    setEditingDiceFaces(String(participant.diceFaces));
    setEditingFlatBonus(String(participant.flatBonus));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingName.trim()) {
      const updated = [...initiativePoolList];
      const existing = updated[editingIndex];
      const updatedParticipant = {
        ...existing,
        name: editingName.trim(),
        diceFaces: Math.max(1, parseIntegerDraft(editingDiceFaces, 20)),
        flatBonus: parseNumberDraft(editingFlatBonus, 0),
      };
      const participantId = participantIdsRef.current.get(existing);
      if (participantId) participantIdsRef.current.set(updatedParticipant, participantId);
      updated[editingIndex] = updatedParticipant;
      updateData({ initiativePool: updated });
    }
    setEditingIndex(null);
    setEditingName('');
    setEditingDiceFaces('20');
    setEditingFlatBonus('0');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  return (
    <div className="widget-editor widget-editor--initiative-tracker space-y-4">
      {/* Widget Label */}
      <CollapsibleSection title="General">
        <label className="block text-xs font-semibold text-theme-ink">
          Widget label
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Initiative Tracker"
          />
          {label && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink"
              onClick={() => updateData({ label: '' })}
            >
              ✕
            </button>
          )}
        </div>
        </label>
      </CollapsibleSection>

      <CollapsibleSection className="widget-editor__option-group">
        <h3 id={`initiative-behavior-heading-${widget.id}`} className="widget-editor__section-title">Tracker behavior</h3>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            id="showRollButton"
            checked={initiativeShowRollButton}
            onChange={(e) => updateData({ initiativeShowRollButton: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs text-theme-ink">Include "Roll Initiative" button</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            id="showInitiativeTimer"
            checked={initiativeShowTimer}
            onChange={(e) => updateData({ initiativeShowTimer: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs text-theme-ink">Include turn timer</span>
        </label>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor={`initiative-participant-card-height-${widget.id}`} className="text-xs font-bold uppercase text-theme-muted">
              Participant card height
            </label>
            <span className="widget-editor__section-count">{normalizedParticipantCardHeight}px</span>
          </div>
          <input
            id={`initiative-participant-card-height-${widget.id}`}
            type="range"
            min="16"
            max="48"
            step="2"
            value={normalizedParticipantCardHeight}
            onChange={(e) => updateData({ initiativeParticipantCardHeight: Number(e.target.value) })}
            className="w-full accent-theme-accent"
          />
        </div>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              id="advanceTimeTrackers"
              checked={initiativeAdvanceTimeTrackers}
              onChange={(e) => updateData({ initiativeAdvanceTimeTrackers: e.target.checked })}
              className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
            />
            <span className="text-xs text-theme-ink">Advance Time Trackers on new round</span>
          </label>

          {initiativeAdvanceTimeTrackers && (
            <div className="ml-6 space-y-2 border-l-2 border-theme-accent pl-3">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  id="advanceByRound"
                  checked={initiativeAdvanceByRound}
                  onChange={(e) => updateData({ initiativeAdvanceByRound: e.target.checked })}
                  className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
                />
                <span className="text-xs text-theme-ink">Advance by 1 round (for round-mode trackers)</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="text-xs text-theme-ink">Also advance by:</label>
                <input
                  type="number"
                  min={0}
                  value={advanceTimeAmountDraft ?? initiativeAdvanceTimeAmount}
                  onChange={(e) => updateAdvanceTimeAmount(e.target.value)}
                  onBlur={commitAdvanceTimeAmount}
                  className="h-10 w-16 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <select
                  value={initiativeAdvanceTimeUnit}
                  onChange={(e) => updateData({ initiativeAdvanceTimeUnit: e.target.value })}
                  className="rounded border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
              <p className="widget-editor__hint text-xs leading-4 text-theme-muted">
                Time Trackers will be updated when the turn cycles back to the first participant.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Participant Pool */}
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`initiative-pool-heading-${widget.id}`} className="widget-editor__section-title">Participant pool</h3>
          <span className="widget-editor__section-count">{initiativePool.length}</span>
        </div>

        {/* Add new participant form */}
        <form onSubmit={addParticipant} className="widget-editor__option-group mb-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={`initiative-new-participant-name-${widget.id}`} className="text-xs font-semibold uppercase text-theme-muted">
              Create a new participant
            </label>
            <input
              id={`initiative-new-participant-name-${widget.id}`}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Participant name..."
              className="h-10 w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
            />
            
            {initiativeShowRollButton && (
              <div className="widget-editor__initiative-new-stats flex gap-10">
                <div className="flex-1">
                  <label htmlFor={`initiative-new-die-${widget.id}`} className="text-xs font-semibold uppercase text-theme-muted">Die</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-theme-ink">d</span>
                    <input
                      id={`initiative-new-die-${widget.id}`}
                      type="number"
                      min={1}
                      value={newDiceFaces}
                      onChange={(e) => setNewDiceFaces(e.target.value)}
                      className="h-10 w-16 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase text-theme-muted">Initiative bonus</span>
                  <LabeledNumberField
                    value={parseNumberDraft(newFlatBonus, 0)}
                    onChange={(v) => setNewFlatBonus(String(v))}
                    onClear={() => setNewFlatBonus('')}
                    fieldLabel={newFlatBonusLabel}
                    onFieldLabelChange={(l) => setNewFlatBonusLabel(l)}
                    formula={newFlatBonusFormula}
                    onFormulaChange={(f) => setNewFlatBonusFormula(f)}
                    compact
                    controlHeight="input"
                    allowEmpty
                  />
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="h-10 w-full rounded-button bg-theme-accent px-3 py-1 text-sm text-theme-paper transition-opacity hover:opacity-90"
            >
              Add to Pool
            </button>
          </div>
        </form>

        {/* Pool list */}
        {initiativePool.length === 0 ? (
          <div className="text-sm text-theme-muted italic text-center py-2">
            No participants in pool
          </div>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {reorderableParticipants.map(({ id, item: participant }, index) => (
              <div
                key={id}
                ref={(element) => setRowRef(id, element)}
                className="widget-editor__initiative-participant-row pointer-sort-row flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-2 transition-colors"
              >
                {editingIndex === index ? (
                  // Edit mode
                  <div className="flex-1 space-y-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                    />
                    {initiativeShowRollButton && (
                      <div className="widget-editor__initiative-edit-stats flex items-end gap-10">
                        <div>
                          <span className="text-xs text-theme-muted">Die</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-theme-muted">d</span>
                            <input
                              type="number"
                              min={1}
                              value={editingDiceFaces}
                              onChange={(e) => setEditingDiceFaces(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              className="h-10 w-14 rounded-button border border-theme-border bg-theme-paper px-1 text-xs text-theme-ink focus:border-theme-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-xs text-theme-muted">Initiative Bonus</span>
                          <LabeledNumberField
                            value={parseNumberDraft(editingFlatBonus, 0)}
                            onChange={(v) => setEditingFlatBonus(String(v))}
                            onClear={() => setEditingFlatBonus('')}
                            fieldLabel={editingIndex !== null ? (initiativePool[editingIndex] as InitiativeParticipant)?.flatBonusLabel : undefined}
                            onFieldLabelChange={(l) => {
                              if (editingIndex !== null) {
                                const updated = [...initiativePool] as InitiativeParticipant[];
                                updated[editingIndex] = { ...updated[editingIndex], flatBonusLabel: l };
                                updateData({ initiativePool: updated });
                              }
                            }}
                            formula={editingIndex !== null ? (initiativePool[editingIndex] as InitiativeParticipant)?.flatBonusFormula : undefined}
                            onFormulaChange={(f) => {
                              if (editingIndex !== null) {
                                const updated = [...initiativePool] as InitiativeParticipant[];
                                updated[editingIndex] = { ...updated[editingIndex], flatBonusFormula: f };
                                updateData({ initiativePool: updated });
                              }
                            }}
                            compact
                            controlHeight="input"
                            allowEmpty
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        className="flex-1 px-2 py-0.5 text-xs bg-theme-accent text-theme-paper rounded hover:opacity-90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="flex-1 px-2 py-0.5 text-xs border border-theme-border text-theme-ink rounded hover:bg-theme-background"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <Tooltip content="Drag to reorder">
                      <button
                        type="button"
                        className="widget-editor__initiative-reorder flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                        onPointerDown={(event) => startDrag(id, event)}
                        onKeyDown={(event) => handleReorderKey(id, event)}
                        disabled={editingIndex !== null || reorderableParticipants.length < 2}
                        aria-label={`Reorder ${participant.name || `participant ${index + 1}`}`}
                        title="Drag to reorder. Arrow keys also work."
                      >
                        <GripVerticalIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                      <span className="widget-editor__initiative-name flex-1 text-sm text-theme-ink truncate">
                      {participant.name}
                    </span>
                    {initiativeShowRollButton && (
                      <span className="widget-editor__initiative-stats text-xs text-theme-muted flex items-center gap-0.5">
                        d{participant.diceFaces}+{participant.flatBonus}
                        {(participant as InitiativeParticipant).flatBonusLabel && (
                          <span className="text-[9px] bg-theme-accent/15 text-theme-accent px-1 rounded">@{(participant as InitiativeParticipant).flatBonusLabel}</span>
                        )}
                        {(participant as InitiativeParticipant).flatBonusFormula && (
                          <span className="text-[9px] bg-theme-accent/15 text-theme-accent px-1 rounded italic">fx</span>
                        )}
                      </span>
                    )}
                    <Tooltip content="Edit participant">
                      <button
                        type="button"
                        onClick={() => startEditing(index)}
                        className="widget-editor__initiative-edit widget-control h-10 w-10 flex-shrink-0 p-0"
                        aria-label={`Edit ${participant.name || `participant ${index + 1}`}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete participant">
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        className="widget-editor__initiative-delete flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                        aria-label={`Delete ${participant.name || `participant ${index + 1}`}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
