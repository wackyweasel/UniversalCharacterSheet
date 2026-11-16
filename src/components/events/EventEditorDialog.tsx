import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { useEventsPanelStore, type EventEditorRequest } from '../../store/useEventsPanelStore';
import { useAutomationsPanelStore } from '../../store/useAutomationsPanelStore';
import { getTutorialStepIndex, TUTORIAL_NARROW_BREAKPOINT, TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import type { Character, CharacterEventStep } from '../../types';
import { createBlankEffect, createEffect, createTrigger } from '../../events/drafts';
import { getDraftProblems, getNodeProblems, initDraft, toEventPayload, type EventDraft } from '../../events/editorDraft';
import {
  conditionNodeId,
  effectNodeId,
  hasCondition,
  insertCondition,
  insertEffect,
  layoutEventGraph,
  moveEffect,
  removeEffect,
  TRIGGER_NODE_ID,
  type GraphSlot,
} from '../../events/graph';
import { getEffectDef, getTriggerDef } from '../../events/registry';
import { createStep } from '../../events/steps';
import { collectLabels } from '../../utils/formulaEngine';
import { BoltIcon, XIcon } from '../icons';
import { EventGraphCanvas } from './EventGraphCanvas';
import { EventNodeInspector } from './EventNodeInspector';
import { fieldClass } from './EventPartFields';

/** Body width under which the settings panel sits below the graph instead of beside it. */
const STACKED_BELOW = 680;
const NO_INSET = { top: 0, bottom: 0 };
const tutorialTargetClass = 'outline outline-4 outline-blue-500 outline-offset-2';

const findDiceRoller = (character: Character, label: string) => character.sheets
  .flatMap((sheet) => sheet.widgets)
  .find((widget) => widget.type === 'DICE_ROLLER' && String(widget.data?.label || '').toLowerCase() === label);

/** Events tutorial: fills in the part of the event that the step explains, unless the reader already chose one. */
function applyTutorialLesson(character: Character, stepId: string, draft: EventDraft): EventDraft {
  if (stepId === 'events-editor-trigger') {
    const attack = findDiceRoller(character, 'attack');
    const def = getTriggerDef('dice.rolled');
    if (!attack || !def) return draft;
    return {
      ...draft,
      name: draft.name.trim() ? draft.name : 'Hit',
      trigger: draft.trigger.kind ? draft.trigger : createTrigger(character, def, attack),
    };
  }
  if (stepId === 'events-editor-condition') {
    return draft.steps[0]?.condition?.trim() ? draft : withFirstStep(draft, { condition: '@event_total >= 12' });
  }
  if (stepId === 'events-editor-effects') {
    const damage = findDiceRoller(character, 'damage');
    const roll = getEffectDef('roller.roll');
    const log = getEffectDef('log.message');
    if (!damage || !roll || !log || draft.steps[0]?.effects.some((effect) => effect.kind)) return draft;
    return withFirstStep(draft, {
      effects: [
        createEffect(character, roll, damage),
        { ...createEffect(character, log), params: { message: 'Hit with a {@event_total}!' } },
      ],
    });
  }
  if (stepId === 'events-inline-editor-effects') {
    const slots = character.sheets.flatMap((sheet) => sheet.widgets).find((widget) => widget.type === 'SPELL_SLOT');
    const useSlot = getEffectDef('spell.use');
    const roll = getEffectDef('dice.roll');
    if (!slots || !useSlot || !roll || draft.steps[0]?.effects.some((effect) => effect.kind)) return draft;
    return withFirstStep(draft, {
      effects: [
        { ...createEffect(character, useSlot, slots), target: 'level:3', params: { upcast: 'no', count: '1' } },
        { ...createEffect(character, roll), params: { dice: '8d6', title: 'Fireball' } },
      ],
    });
  }
  return draft;
}

function withFirstStep(draft: EventDraft, patch: Partial<CharacterEventStep>): EventDraft {
  const [first, ...rest] = draft.steps;
  return { ...draft, steps: [{ ...(first ?? createStep()), ...patch }, ...rest] };
}

/** Events tutorial: the node whose settings the step explains; null shows the whole graph, undefined leaves the selection alone. */
function getLessonNode(stepId: string, draft: EventDraft): string | null | undefined {
  const first = draft.steps[0];
  if (stepId === 'events-editor-trigger' || stepId === 'events-editor-data') return TRIGGER_NODE_ID;
  if (stepId === 'events-editor-condition') return first && hasCondition(first) ? conditionNodeId(first.id) : undefined;
  if (stepId === 'events-editor-effects') return first?.effects[0] ? effectNodeId(first.effects[0].id) : undefined;
  if (stepId === 'events-inline-editor-effects') {
    // The second effect is the dice roll the lesson talks about.
    const effect = first?.effects[1] ?? first?.effects[0];
    return effect ? effectNodeId(effect.id) : undefined;
  }
  if (stepId === 'events-editor-save' || stepId === 'events-inline-editor-save') return null;
  return undefined;
}

/** A new event opens on what it needs first: its trigger, else an effect that isn't chosen yet. */
function getStartNode(draft: EventDraft | null): string | null {
  if (!draft) return null;
  if (!draft.trigger.kind) return TRIGGER_NODE_ID;
  const blank = draft.steps.flatMap((step) => [...step.effects, ...(step.otherwise ?? [])]).find((effect) => !effect.kind);
  return blank ? effectNodeId(blank.id) : null;
}

/** Room the tutorial bubble takes when it docks at the top or bottom of a narrow screen, so the editor can stay clear of it. */
function useDockedTutorialInset(active: boolean): { top: number; bottom: number } {
  const [inset, setInset] = useState(NO_INSET);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    // The bubble moves and resizes with each step, so it is followed the way the bubble follows its own target.
    const measure = () => {
      const rect = window.innerWidth < TUTORIAL_NARROW_BREAKPOINT
        ? document.querySelector('[data-tutorial-bubble="true"]')?.getBoundingClientRect()
        : undefined;
      const next = !rect || rect.height === 0
        ? NO_INSET
        : rect.top < window.innerHeight / 2
          ? { top: Math.ceil(rect.bottom) + 8, bottom: 0 }
          : { top: 0, bottom: Math.ceil(window.innerHeight - rect.top) + 8 };
      setInset((current) => (current.top === next.top && current.bottom === next.bottom ? current : next));
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    return () => {
      window.cancelAnimationFrame(frame);
      setInset(NO_INSET);
    };
  }, [active]);
  return inset;
}

interface EventEditorDialogProps {
  character: Character;
  request: EventEditorRequest;
}

function EventEditorDialog({ character, request }: EventEditorDialogProps) {
  const closeEditor = useEventsPanelStore((state) => state.closeEditor);
  const addEvent = useStore((state) => state.addCharacterEvent);
  const updateEvent = useStore((state) => state.updateCharacterEvent);
  const isEditing = !!request.eventId;
  const [draft, setDraft] = useState<EventDraft | null>(() => initDraft(character, request));
  const [attempted, setAttempted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => (isEditing ? null : getStartNode(draft)));
  const [reveal, setReveal] = useState<{ id: string; tick: number; roomBelow?: boolean } | null>(null);
  const [stacked, setStacked] = useState(false);
  // A finger pans the graph from anywhere, so effects are moved with the panel's buttons instead of by dragging.
  const [canDrag] = useState(() => !window.matchMedia('(pointer: coarse)').matches);
  const initialCharacterId = useRef(character.id);
  const nameRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const eventExists = !request.eventId || !!character.events?.some((event) => event.id === request.eventId);
  const tutorialStepId = useTutorialStore((state) => (state.tutorialStep !== null ? TUTORIAL_STEPS[state.tutorialStep]?.id : undefined));
  const inTutorialLesson = !isEditing && (
    tutorialStepId === 'events-new'
    || tutorialStepId === 'events-inline-button'
    || !!tutorialStepId?.startsWith('events-editor-')
    || !!tutorialStepId?.startsWith('events-inline-editor-')
  );
  const tutorialInset = useDockedTutorialInset(inTutorialLesson);

  const showNode = (nodeId: string, roomBelow = false) => setReveal((current) => ({ id: nodeId, tick: (current?.tick ?? 0) + 1, roomBelow }));
  const select = (nodeId: string | null, isNew = false) => {
    setSelectedId(nodeId);
    if (nodeId) showNode(nodeId, isNew);
  };

  // A layout effect, so the lesson's fields exist before the tutorial bubble scrolls to them.
  useLayoutEffect(() => {
    if (isEditing || !tutorialStepId || !draft) return;
    const next = applyTutorialLesson(character, tutorialStepId, draft);
    setDraft(next);
    const lessonNode = getLessonNode(tutorialStepId, next);
    if (lessonNode !== undefined) select(lessonNode);
    // Only when the step changes, so the reader's own edits stay.
  }, [tutorialStepId]);

  useEffect(() => {
    if (!draft || character.id !== initialCharacterId.current || !eventExists) closeEditor();
  }, [character.id, closeEditor, draft, eventExists]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeEditor();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [closeEditor]);

  // Follows the dialog rather than the window: the tutorial makes the dialog narrower to leave room for its bubble.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => setStacked(body.clientWidth < STACKED_BELOW);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const baseLabels = useMemo(() => collectLabels(character), [character]);
  const problems = useMemo(() => (draft ? getDraftProblems(character, draft, baseLabels) : null), [baseLabels, character, draft]);
  const steps = draft?.steps;
  const graph = useMemo(() => layoutEventGraph(steps ?? []), [steps]);
  const showProblems = attempted || isEditing;
  const nodeProblems = useMemo(() => {
    if (!draft || !problems) return new Map<string, string[]>();
    const all = getNodeProblems(draft, problems);
    if (showProblems) return all;
    // Before a first try at saving, only a condition that was written and doesn't work is pointed out.
    const written = new Set(draft.steps.filter((step) => step.condition?.trim()).map((step) => conditionNodeId(step.id)));
    return new Map([...all].filter(([nodeId]) => written.has(nodeId)));
  }, [draft, problems, showProblems]);

  if (!draft || !problems) return null;

  const selectedNode = graph.nodes.find((node) => node.id === selectedId && node.kind !== 'add') ?? null;
  const update = (patch: Partial<EventDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  // Through the latest draft, so a field that was registered earlier never writes stale steps.
  const changeSteps = (change: (steps: CharacterEventStep[]) => CharacterEventStep[]) => setDraft((current) => (
    current ? { ...current, steps: change(current.steps) } : current
  ));

  const addEffect = (slot: GraphSlot) => {
    const effect = createBlankEffect();
    changeSteps((current) => insertEffect(current, slot, effect));
    select(effectNodeId(effect.id), true);
  };
  const addCondition = (slot: GraphSlot) => {
    const added = insertCondition(draft.steps, slot);
    if (!added) return;
    update({ steps: added.steps });
    select(conditionNodeId(added.stepId), true);
  };

  // The move can send an effect to a branch that is out of view, so it is followed there.
  const moveEffectTo = (effectId: string, slot: GraphSlot) => {
    changeSteps((current) => moveEffect(current, effectId, slot));
    showNode(effectNodeId(effectId));
  };

  const save = (asDraft = false) => {
    setAttempted(true);
    if (!asDraft && problems.count > 0) {
      const [first] = getNodeProblems(draft, problems).keys();
      // An "add" node has no settings to open, so it is only brought into view.
      if (first && graph.nodes.some((node) => node.id === first && node.kind !== 'add')) select(first);
      else if (first) showNode(first);
      return;
    }
    const payload = asDraft ? { ...toEventPayload(character, draft), enabled: false } : toEventPayload(character, draft);
    const telemetrySource = inTutorialLesson ? 'tutorial' : request.source ?? 'events_panel';
    let eventId: string | null = request.eventId ?? null;
    if (request.eventId) updateEvent(request.eventId, payload, telemetrySource);
    else eventId = addEvent(payload, telemetrySource);
    // Move the Events tutorial past the editor before closing it, or the tutorial would send the reader back to the step that opened it.
    if (asDraft) {
      // The tutorial waits for a finished event.
    } else if (!isEditing && tutorialStepId?.startsWith('events-editor-')) {
      useTutorialStore.getState().setTutorialStep(getTutorialStepIndex('events-editor-save') + 1);
    } else if (!isEditing && tutorialStepId?.startsWith('events-inline-editor-')) {
      useTutorialStore.getState().setTutorialStep(getTutorialStepIndex('events-inline-editor-save') + 1);
    }
    closeEditor();
    if (eventId && useAutomationsPanelStore.getState().isOpen && useAutomationsPanelStore.getState().tab === 'events') {
      useEventsPanelStore.setState({ focusEventId: eventId });
    }
  };

  return createPortal(
    <div
      data-event-editor-dialog="true"
      data-touch-camera-ignore="true"
      className={`fixed inset-0 z-[11000] flex items-center justify-center bg-black/55 p-2 sm:p-4 animate-fade-in ${inTutorialLesson ? 'sm:justify-start sm:pl-6' : ''}`}
      style={{ paddingTop: tutorialInset.top || undefined, paddingBottom: tutorialInset.bottom || undefined }}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-editor-title"
        data-tutorial="event-editor"
        className={`widget-edit-modal__aux-dialog flex h-[min(92vh,56rem)] max-h-full w-full ${inTutorialLesson ? 'sm:max-w-[min(52rem,calc(100vw-24rem))]' : 'max-w-6xl'} flex-col overflow-hidden animate-modal-in`}
      >
        <header className="widget-edit-modal__header flex flex-none items-center justify-between gap-3 border-b border-theme-border">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <BoltIcon className="h-5 w-5 flex-none text-theme-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="event-editor-title" className="font-heading text-[11px] font-bold uppercase tracking-wide text-theme-muted">
                {isEditing ? 'Edit event' : 'New event'}
              </h2>
              <input
                ref={nameRef}
                type="text"
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                aria-label="Event name"
                placeholder="Name (optional), such as Bloodied"
                autoComplete="off"
                className={`${fieldClass} mt-0.5 max-w-md`}
              />
            </div>
          </div>
          <button type="button" onClick={closeEditor} aria-label="Close event editor" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div ref={bodyRef} className={`flex min-h-0 flex-1 ${stacked ? 'flex-col' : ''}`}>
          <div className="relative min-h-[9rem] min-w-0 flex-1">
            <EventGraphCanvas
              character={character}
              draft={draft}
              graph={graph}
              selectedId={selectedNode?.id ?? null}
              problems={nodeProblems}
              reveal={reveal}
              canDrag={canDrag}
              onSelect={(nodeId) => select(nodeId)}
              onAddEffect={addEffect}
              onAddCondition={addCondition}
              onMoveEffect={moveEffectTo}
              onRemoveEffect={(effectId) => changeSteps((current) => removeEffect(current, effectId))}
            />
          </div>
          {stacked && !selectedNode && (
            <p className="flex-none border-t border-theme-border px-3 py-1.5 text-center text-[11px] text-theme-muted">
              Select a node to edit it. Use + to add to the flow.
            </p>
          )}
          {(!stacked || selectedNode) && (
            <aside
              aria-label={selectedNode ? 'Settings of the selected node' : 'How the graph works'}
              className={`event-editor__panel flex-none overflow-y-auto border-theme-border ${stacked ? 'max-h-[58%] border-t' : 'w-[21rem] border-l'}`}
            >
              <EventNodeInspector
                character={character}
                draft={draft}
                node={selectedNode}
                problems={problems}
                showProblems={showProblems}
                canDrag={canDrag}
                onChangeTrigger={(trigger) => update({ trigger })}
                onChangeSteps={changeSteps}
                onClose={stacked ? () => setSelectedId(null) : undefined}
              />
            </aside>
          )}
        </div>

        <footer className="widget-edit-modal__footer flex flex-none flex-wrap items-center justify-between gap-2 border-t border-theme-border">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              aria-label="Event is on"
              onClick={() => update({ enabled: !draft.enabled })}
              className="event-switch"
            />
            <span>{draft.enabled ? 'On' : 'Off'}</span>
          </label>
          <div className="flex min-w-0 items-center gap-2">
            {attempted && problems.count > 0 && (
              <span className="hidden text-xs text-amber-600 sm:inline" role="status">
                Fix {problems.count === 1 ? 'the problem' : `${problems.count} problems`} to save
              </span>
            )}
            <button type="button" onClick={closeEditor} className="widget-control px-4 py-2 text-xs font-bold">Cancel</button>
            {problems.count > 0 && !inTutorialLesson && (
              <button
                type="button"
                onClick={() => save(true)}
                title="Keep what you have, turned off, and finish it later"
                className="widget-control px-4 py-2 text-xs font-bold"
              >
                Save as draft
              </button>
            )}
            <button
              type="button"
              onClick={() => save()}
              data-tutorial="event-editor-save"
              className={`widget-control widget-control--primary px-4 py-2 text-xs font-bold ${!isEditing && (tutorialStepId === 'events-editor-save' || tutorialStepId === 'events-inline-editor-save') ? tutorialTargetClass : ''}`}
            >
              {isEditing ? 'Save' : 'Create event'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Shows the event editor whenever one is requested. */
export function EventEditorHost() {
  const editor = useEventsPanelStore((state) => state.editor);
  const editorKey = useEventsPanelStore((state) => state.editorKey);
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId) ?? null);
  if (!editor || !character) return null;
  return <EventEditorDialog key={editorKey} character={character} request={editor} />;
}
