import React, { useState, useRef } from 'react';
import { InitiativeParticipant } from '../../types';
import { EditorProps } from './types';

export function InitiativeTrackerEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    initiativePool = [], 
    initiativeShowRollButton = true,
    initiativeAdvanceTimeTrackers = false,
    initiativeAdvanceByRound = true,
    initiativeAdvanceTimeAmount = 6,
    initiativeAdvanceTimeUnit = 'seconds'
  } = widget.data;

  const [newName, setNewName] = useState('');
  const [newDiceFaces, setNewDiceFaces] = useState(20);
  const [newFlatBonus, setNewFlatBonus] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDiceFaces, setEditingDiceFaces] = useState(20);
  const [editingFlatBonus, setEditingFlatBonus] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const addParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const newParticipant: InitiativeParticipant = {
        name: newName.trim(),
        diceFaces: newDiceFaces,
        flatBonus: newFlatBonus
      };
      updateData({ 
        initiativePool: [...initiativePool, newParticipant] 
      });
      setNewName('');
      setNewDiceFaces(20);
      setNewFlatBonus(0);
    }
  };

  const removeParticipant = (index: number) => {
    const updated = [...initiativePool];
    updated.splice(index, 1);
    updateData({ initiativePool: updated });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    const participant = initiativePool[index] as InitiativeParticipant;
    setEditingIndex(index);
    setEditingName(participant.name);
    setEditingDiceFaces(participant.diceFaces);
    setEditingFlatBonus(participant.flatBonus);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingName.trim()) {
      const updated = [...initiativePool] as InitiativeParticipant[];
      updated[editingIndex] = {
        name: editingName.trim(),
        diceFaces: editingDiceFaces,
        flatBonus: editingFlatBonus
      };
      updateData({ initiativePool: updated });
    }
    setEditingIndex(null);
    setEditingName('');
    setEditingDiceFaces(20);
    setEditingFlatBonus(0);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  // Drag and drop handlers
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

    const updated = [...initiativePool] as InitiativeParticipant[];
    const [draggedItem] = updated.splice(dragIdx, 1);
    updated.splice(dropIndex, 0, draggedItem);
    updateData({ initiativePool: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Widget Label */}
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
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
      </div>

      {/* Show Roll Initiative Button Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showRollButton"
          checked={initiativeShowRollButton}
          onChange={(e) => updateData({ initiativeShowRollButton: e.target.checked })}
          className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
        />
        <label htmlFor="showRollButton" className="text-sm text-theme-ink">
          Include "Roll Initiative" button
        </label>
      </div>

      {/* Advance Time Trackers on New Round */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="advanceTimeTrackers"
            checked={initiativeAdvanceTimeTrackers}
            onChange={(e) => updateData({ initiativeAdvanceTimeTrackers: e.target.checked })}
            className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
          />
          <label htmlFor="advanceTimeTrackers" className="text-sm text-theme-ink">
            Advance Time Trackers on new round
          </label>
        </div>

        {initiativeAdvanceTimeTrackers && (
          <div className="ml-6 p-2 border border-theme-border rounded bg-theme-background/50 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="advanceByRound"
                checked={initiativeAdvanceByRound}
                onChange={(e) => updateData({ initiativeAdvanceByRound: e.target.checked })}
                className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
              />
              <label htmlFor="advanceByRound" className="text-sm text-theme-ink">
                Advance by 1 round (for round-mode trackers)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-theme-ink">Also advance by:</label>
              <input
                type="number"
                min={0}
                value={initiativeAdvanceTimeAmount}
                onChange={(e) => updateData({ initiativeAdvanceTimeAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-16 px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
              />
              <select
                value={initiativeAdvanceTimeUnit}
                onChange={(e) => updateData({ initiativeAdvanceTimeUnit: e.target.value })}
                className="px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
              >
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
            <p className="text-xs text-theme-muted">
              Time Trackers will be updated when the turn cycles back to the first participant.
            </p>
          </div>
        )}
      </div>

      {/* Participant Pool */}
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">
          Participant Pool
        </label>

        {/* Add new participant form */}
        <form onSubmit={addParticipant} className="mb-3 p-2 border border-theme-border rounded bg-theme-background/50">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Participant name..."
              className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            />
            
            {initiativeShowRollButton && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-theme-muted">Die</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-theme-ink">d</span>
                    <input
                      type="number"
                      min={1}
                      value={newDiceFaces}
                      onChange={(e) => setNewDiceFaces(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-theme-muted">Bonus</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-theme-ink">+</span>
                    <input
                      type="number"
                      value={newFlatBonus}
                      onChange={(e) => setNewFlatBonus(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-3 py-1 text-sm bg-theme-accent text-theme-paper rounded hover:opacity-90 transition-opacity"
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
            {(initiativePool as InitiativeParticipant[]).map((participant, index) => (
              <div
                key={index}
                draggable={editingIndex !== index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-2 border border-theme-border rounded bg-theme-paper transition-colors ${
                  dragOverIndex === index ? 'ring-2 ring-theme-accent' : ''
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
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
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-theme-muted">d</span>
                          <input
                            type="number"
                            min={1}
                            value={editingDiceFaces}
                            onChange={(e) => setEditingDiceFaces(Math.max(1, parseInt(e.target.value) || 1))}
                            onKeyDown={handleEditKeyDown}
                            className="w-14 px-1 py-0.5 text-xs border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-theme-muted">+</span>
                          <input
                            type="number"
                            value={editingFlatBonus}
                            onChange={(e) => setEditingFlatBonus(parseInt(e.target.value) || 0)}
                            onKeyDown={handleEditKeyDown}
                            className="w-14 px-1 py-0.5 text-xs border border-theme-border rounded bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
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
                    <span 
                      className="text-theme-muted cursor-grab active:cursor-grabbing select-none"
                    >⠿</span>
                    <span className="flex-1 text-sm text-theme-ink truncate">
                      {participant.name}
                    </span>
                    {initiativeShowRollButton && (
                      <span className="text-xs text-theme-muted">
                        d{participant.diceFaces}+{participant.flatBonus}
                      </span>
                    )}
                    <button
                      onClick={() => startEditing(index)}
                      className="text-theme-muted hover:text-theme-ink text-sm"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => removeParticipant(index)}
                      className="text-theme-muted hover:text-red-500 text-sm"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
