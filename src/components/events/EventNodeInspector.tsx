import { useEffect, useRef, useState } from 'react';
import type { Character, CharacterEventEffect, CharacterEventStep, CharacterEventTrigger } from '../../types';
import { eventLabel, resultLabel } from '../../events/constants';
import { getAvailableData, type DraftProblems, type EventDataGroup, type EventDraft } from '../../events/editorDraft';
import { addRollBranch, findEffect, findStep, getRollBranches, hasCondition, hasStepsAfter, parseRollBranch, removeCondition, removeEffect, renameRollBranch, setRollTarget, shiftEffect, updateStep, type GraphNode } from '../../events/graph';
import { findWidget } from '../../events/helpers';
import { describeEffect, describeTrigger, getEffectOutputs, getEventIcon, getTriggerOutputs } from '../../events/registry';
import { getEventEffects, mapEventEffects } from '../../events/steps';
import { sanitizeLabelInput } from '../../utils/characterVariables';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '../icons';
import { Field, fieldClass, PartFields, ProblemList, type DataTarget, type RegisterDataTarget } from './EventPartFields';

type StepsChange = (change: (steps: CharacterEventStep[]) => CharacterEventStep[]) => void;
type DataStatus = { text: string; id: number; owner: string };

/** What the data chips of a node need: where to report, and what to do when one is picked. */
interface DataChipsContext {
  status: DataStatus;
  onPick: (ref: string, owner: string) => void;
}

const smallIconButtonClass = 'widget-control h-8 w-8 flex-none text-theme-muted';

/** Adds `ref` at the field's caret, or at its end; text fields get `{…}` around it unless the caret is already inside braces. */
function insertDataRef(target: DataTarget, ref: string, atEnd: boolean): number {
  const { element, mode } = target;
  const value = element.value;
  const start = atEnd ? value.length : element.selectionStart ?? value.length;
  const before = value.slice(0, start);
  const after = value.slice(atEnd ? start : element.selectionEnd ?? start);
  let text = mode === 'text' && before.lastIndexOf('{') <= before.lastIndexOf('}') ? `{${ref}}` : ref;
  if (/[\w)}]$/.test(before)) text = ` ${text}`;
  target.setValue(before + text + after);
  return before.length + text.length;
}

/** A result name nobody else uses: `base`, else `base_2`, `base_3`… */
function freeResultName(base: string, all: CharacterEventEffect[], effectId: string): string {
  const taken = new Set(all.filter((effect) => effect.id !== effectId).map((effect) => effect.resultName?.trim()));
  let name = base;
  for (let index = 2; taken.has(name); index += 1) name = `${base}_${index}`;
  return name;
}

/** Keeps an effect's result name in step with its kind: only kinds with outputs have one, and a new one gets a free default. */
function withResultName(previous: CharacterEventEffect, next: CharacterEventEffect, all: CharacterEventEffect[]): CharacterEventEffect {
  if (getEffectOutputs(next.kind).length === 0) {
    const { resultName: _unused, ...rest } = next;
    return rest;
  }
  if (next.resultName !== undefined || previous.kind === next.kind) return next;
  if (previous.resultName?.trim()) return { ...next, resultName: previous.resultName };
  return { ...next, resultName: freeResultName(next.kind === 'dialog.show' ? 'answer' : 'roll', all, next.id) };
}

interface DataChipsProps {
  owner: string;
  title: string;
  groups: EventDataGroup[];
  hint: string;
  chips: DataChipsContext;
  tutorial?: boolean;
}

function DataChips({ owner, title, groups, hint, chips, tutorial }: DataChipsProps) {
  if (!groups.some((group) => group.items.length)) return null;
  const titleId = `event-editor-data-${owner}`;
  return (
    <div className="mt-3 border-t border-dashed border-theme-border pt-2.5" role="group" aria-labelledby={titleId} data-tutorial={tutorial ? 'event-editor-data' : undefined}>
      <p id={titleId} className="text-xs font-bold text-theme-ink">{title}</p>
      {groups.map((group) => (
        <div key={group.title} className="mt-1.5">
          {group.title && <p className="mb-1 text-[11px] text-theme-muted">{group.title}</p>}
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <button
                key={item.ref}
                type="button"
                data-event-data-chip="true"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chips.onPick(item.ref, owner)}
                className="event-editor__chip"
              >
                <code>{item.ref}</code>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-1.5 text-[11px] leading-snug text-theme-muted" aria-live="polite">
        {(chips.status.owner === owner && chips.status.text) || hint}
      </p>
    </div>
  );
}

function Sentence({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 border-t border-dashed border-theme-border pt-2.5 text-sm text-theme-ink">
      <span className="event-flow__icon" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1 break-words">{text}</span>
    </p>
  );
}

interface HeaderProps {
  pill: 'when' | 'if' | 'then' | 'else';
  pillLabel: string;
  title: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

function Header({ pill, pillLabel, title, onClose, children }: HeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`event-flow__pill event-flow__pill--${pill} w-14 flex-none`}>{pillLabel}</span>
      <h3 className="min-w-0 flex-1 text-sm font-bold text-theme-ink">{title}</h3>
      {children}
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Hide this panel" title="Hide" className={smallIconButtonClass}>
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface EventNodeInspectorProps {
  character: Character;
  draft: EventDraft;
  /** The selected trigger, condition or effect node. */
  node: GraphNode | null;
  problems: DraftProblems;
  showProblems: boolean;
  /** Effects can be dragged in the graph. */
  canDrag: boolean;
  onChangeTrigger: (trigger: CharacterEventTrigger) => void;
  onChangeSteps: StepsChange;
  /** Present when the panel covers part of the graph and can be put away. */
  onClose?: () => void;
}

/** The settings of the node selected in the graph. */
export function EventNodeInspector({ node, canDrag, ...props }: EventNodeInspectorProps) {
  if (!node) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-bold text-theme-ink">How this event runs</h3>
        <p className="mt-1 text-xs leading-relaxed text-theme-muted">It starts at the trigger and follows the links.</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-theme-ink">
          <li>Select a node to edit it here.</li>
          <li>Use + on a link to add an effect or a condition there.</li>
          <li>A condition sends the event down Yes when it is true and down No when it is false. Each side can hold its own effects and conditions, and both meet again below.</li>
          <li>A dice roll can set a target number: it then leaves by one path when its total reaches the target and by another when it falls short.</li>
          <li>Drag from the end of a Yes or No path to any other step, even in another branch, or to End, to jump there.</li>
          {canDrag && <li>Drag an effect onto a + to move it.</li>}
        </ul>
      </div>
    );
  }
  return <NodeSettings key={node.id} node={node} {...props} />;
}

function NodeSettings({ character, draft, node, problems, showProblems, onChangeTrigger, onChangeSteps, onClose }: Omit<EventNodeInspectorProps, 'node' | 'canDrag'> & { node: GraphNode }) {
  const dataTarget = useRef<DataTarget | null>(null);
  /** Where chips go when no field was being typed in, for a node with one obvious field. */
  const fallbackTarget = useRef<DataTarget | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus>({ text: '', id: 0, owner: '' });

  useEffect(() => {
    if (!dataStatus.text) return;
    const timer = window.setTimeout(() => setDataStatus((current) => (current.id === dataStatus.id ? { ...current, text: '' } : current)), 3000);
    return () => window.clearTimeout(timer);
  }, [dataStatus]);

  const showStatus = (owner: string, text: string) => setDataStatus((current) => ({ text, owner, id: current.id + 1 }));
  const registerDataTarget: RegisterDataTarget = (target) => {
    dataTarget.current = target;
  };

  const pickData = (ref: string, owner: string) => {
    const typedIn = dataTarget.current?.element.isConnected ? dataTarget.current : null;
    const target = typedIn ?? (fallbackTarget.current?.element.isConnected ? fallbackTarget.current : null);
    if (!target) {
      dataTarget.current = null;
      if (!navigator.clipboard) {
        showStatus(owner, `Type ${ref} in a condition or an effect field.`);
        return;
      }
      navigator.clipboard.writeText(ref).then(
        () => showStatus(owner, `Copied ${ref}. Paste it into a condition or an effect field.`),
        () => showStatus(owner, `Type ${ref} in a condition or an effect field.`),
      );
      return;
    }
    const caret = insertDataRef(target, ref, !typedIn);
    showStatus(owner, `Added ${ref} to ${target.label}.`);
    window.requestAnimationFrame(() => {
      target.element.focus({ preventScroll: true });
      target.element.setSelectionRange(caret, caret);
      target.element.scrollIntoView({ block: 'nearest' });
    });
  };
  const chips: DataChipsContext = { status: dataStatus, onPick: pickData };

  // Focusing anything other than a data target or a chip means chips no longer add to the last field.
  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-event-data-target], [data-event-data-chip]')) dataTarget.current = null;
  };

  let content: React.ReactNode = null;

  if (node.kind === 'trigger') {
    const outputs = getTriggerOutputs(draft.trigger.kind);
    content = (
      <section aria-label="Trigger" data-tutorial="event-editor-trigger">
        <Header pill="when" pillLabel="When" title="Something happens on the sheet" onClose={onClose} />
        <PartFields character={character} role="trigger" part={draft.trigger} onChange={onChangeTrigger} />
        {draft.trigger.kind && <Sentence icon={getEventIcon(draft.trigger.kind, findWidget(character, draft.trigger.widgetId))} text={describeTrigger(character, draft.trigger)} />}
        <DataChips
          owner="trigger"
          title="Passes along"
          groups={[{ title: '', items: outputs.map((output) => ({ ref: `@${eventLabel(output.key)}`, label: output.label })) }]}
          hint="Conditions and effects can use these. Select one and its panel lists them, ready to add."
          chips={chips}
          tutorial
        />
        {showProblems && <ProblemList problems={problems.trigger} />}
      </section>
    );
  }

  const step = node.kind === 'condition' ? findStep(draft.steps, node.stepId) : undefined;

  if (step && hasCondition(step)) {
    const first = draft.steps[0] === step;
    const hasNoSide = !!step.otherwise?.length || !!step.otherwiseSteps?.length;
    const changeStep = (change: (current: CharacterEventStep) => CharacterEventStep) => onChangeSteps((steps) => updateStep(steps, step.id, change));
    const makeTarget = (element: HTMLInputElement): DataTarget => ({
      element,
      mode: 'formula',
      label: 'the condition',
      setValue: (condition) => changeStep((current) => ({ ...current, condition })),
    });
    const formula = step.condition ?? '';
    content = (
      <section aria-label="Condition" data-tutorial="event-editor-condition">
        <Header pill="if" pillLabel="Only if" title={first ? 'This is true when it happens' : 'This is true at this point'} onClose={onClose} />
        <Field
          label="Condition"
          help={first
            ? 'A formula, such as @hp < @max_hp / 2 or @level >= 5.'
            : 'A formula, such as @event_attack_total >= 12. It sees the sheet as the earlier effects changed it.'}
        >
          <input
            ref={(element) => {
              fallbackTarget.current = element ? makeTarget(element) : null;
            }}
            type="text"
            value={formula}
            onChange={(event) => changeStep((current) => ({ ...current, condition: event.target.value }))}
            onFocus={(event) => registerDataTarget(makeTarget(event.currentTarget))}
            data-event-data-target="true"
            placeholder={first ? '@hp < @max_hp / 2' : '@event_attack_total >= 12'}
            autoComplete="off"
            spellCheck={false}
            autoFocus={formula === ''}
            className={`${fieldClass} font-mono`}
          />
        </Field>
        <DataChips
          owner="available"
          title="Data you can use here"
          groups={getAvailableData(draft, { stepId: step.id })}
          hint="Click one to add it to the condition."
          chips={chips}
        />
        {hasStepsAfter(draft.steps, step.id) && (
          <div className="mt-3">
            <Field label="When it's false" help={step.otherwiseJump ? 'Applies once everything on the No side has run. Choosing Stop removes the jump from the No side.' : 'Applies once everything on the No side has run.'}>
              <select
                value={step.stopIfFalse ? 'stop' : 'continue'}
                onChange={(event) => changeStep((current) => {
                  // A "no" side that stops the event can't also jump.
                  const { otherwiseJump: _jump, ...rest } = current;
                  return event.target.value === 'stop' ? { ...rest, stopIfFalse: true } : { ...current, stopIfFalse: false };
                })}
                className={fieldClass}
              >
                <option value="continue">Carry on with what follows</option>
                <option value="stop">Stop the event</option>
              </select>
            </Field>
          </div>
        )}
        {(showProblems || formula.trim() !== '') && <ProblemList problems={problems.conditions[step.id]} />}
        <div className="mt-4 border-t border-dashed border-theme-border pt-3">
          <button type="button" onClick={() => onChangeSteps((steps) => removeCondition(steps, step.id))} className="widget-control gap-1.5 px-3 py-1.5 text-xs font-bold">
            <TrashIcon className="h-3.5 w-3.5" /> Remove condition
          </button>
          {(step.effects.length > 0 || !!step.steps?.length || hasNoSide) && (
            <p className="mt-1.5 text-[11px] leading-snug text-theme-muted">
              {hasNoSide ? 'What is on its Yes side stays and always runs. Its No side is removed with it.' : 'What is on its Yes side stays and always runs.'}
            </p>
          )}
        </div>
      </section>
    );
  }

  const location = node.kind === 'effect' && node.effectId ? findEffect(draft.steps, node.effectId) : null;

  if (location) {
    const { effect, section, index } = location;
    const list = section === 'effects' ? location.step.effects : location.step.otherwise ?? [];
    const outputs = getEffectOutputs(effect.kind);
    const resultName = effect.resultName?.trim() ?? '';
    const branch = getRollBranches(draft.steps).get(effect.id);
    const target = branch ? parseRollBranch(branch.condition, effect.resultName) ?? '' : '';
    const canSplit = outputs.some((output) => output.key === 'total');
    const updateEffect = (next: CharacterEventEffect) => onChangeSteps((steps) => {
      const all = getEventEffects({ steps });
      const current = findEffect(steps, effect.id)?.effect;
      const newName = current ? withResultName(current, { ...next, id: current.id }, all).resultName?.trim() : undefined;
      // The target number is a condition on the result's name, which follows a rename.
      const renamed = newName && newName !== current?.resultName?.trim() ? renameRollBranch(steps, effect.id, newName) : steps;
      return mapEventEffects({ steps: renamed }, (item) => (item.id === effect.id ? withResultName(item, { ...next, id: item.id }, all) : item)).steps;
    });
    const addTarget = () => onChangeSteps((steps) => {
      const named = effect.resultName?.trim()
        ? steps
        : mapEventEffects({ steps }, (item) => (item.id === effect.id ? { ...item, resultName: freeResultName('roll', getEventEffects({ steps }), item.id) } : item)).steps;
      return addRollBranch(named, effect.id, '10');
    });
    const makeTargetField = (element: HTMLInputElement): DataTarget => ({
      element,
      mode: 'formula',
      label: 'the target number',
      setValue: (value) => onChangeSteps((steps) => setRollTarget(steps, effect.id, value)),
    });
    // The side of the nearest condition above, which a run of effects further down the same line shares.
    const otherwise = node.side === 'no';
    const title = otherwise ? 'Otherwise, do this' : node.side === 'yes' ? 'Then, do this' : 'Do this';
    content = (
      <section aria-label="Effect" data-tutorial="event-editor-effects">
        <Header pill={otherwise ? 'else' : 'then'} pillLabel={otherwise ? 'Else' : 'Then'} title={title} onClose={onClose}>
          <button
            type="button"
            onClick={() => onChangeSteps((steps) => shiftEffect(steps, effect.id, -1))}
            disabled={index === 0}
            aria-label="Move this effect earlier"
            title="Move earlier"
            className={smallIconButtonClass}
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeSteps((steps) => shiftEffect(steps, effect.id, 1))}
            disabled={index === list.length - 1}
            aria-label="Move this effect later"
            title="Move later"
            className={smallIconButtonClass}
          >
            <ArrowDownIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeSteps((steps) => removeEffect(steps, effect.id))}
            aria-label="Remove this effect"
            title="Remove"
            className={`${smallIconButtonClass} hover:!border-red-500 hover:!bg-red-500`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </Header>
        <PartFields character={character} role="effect" part={effect} onChange={(part) => updateEffect({ ...part, id: effect.id })} onDataTarget={registerDataTarget} />
        {outputs.length > 0 && (
          <div className="mt-3">
            <Field
              label="Result name"
              help={`Later conditions and effects read this result as @${resultLabel(resultName || 'name', outputs[0].key)}. Leave it empty to not pass it along.`}
            >
              <input
                type="text"
                value={effect.resultName ?? ''}
                onChange={(event) => {
                  // A target number reads the result by its name, so a roll that has one keeps a name.
                  if (!branch || event.target.value.trim()) updateEffect({ ...effect, resultName: sanitizeLabelInput(event.target.value) });
                }}
                placeholder="attack"
                autoComplete="off"
                spellCheck={false}
                className={`${fieldClass} font-mono`}
              />
            </Field>
          </div>
        )}
        {canSplit && (
          <div className="mt-3">
            {branch ? (
              <>
                <Field label="Target number" help="The roll leaves by ≥ when its total reaches this number and by < when it falls short. A number or a formula, such as @dc.">
                  <input
                    type="text"
                    value={target}
                    onChange={(event) => onChangeSteps((steps) => setRollTarget(steps, effect.id, event.target.value))}
                    onFocus={(event) => registerDataTarget(makeTargetField(event.currentTarget))}
                    data-event-data-target="true"
                    placeholder="10 or @dc"
                    autoComplete="off"
                    spellCheck={false}
                    className={`${fieldClass} font-mono`}
                  />
                </Field>
                <button type="button" onClick={() => onChangeSteps((steps) => removeCondition(steps, branch.id))} className="widget-control mt-2 gap-1.5 px-3 py-1.5 text-xs font-bold">
                  <TrashIcon className="h-3.5 w-3.5" /> Remove target number
                </button>
                <p className="mt-1.5 text-[11px] leading-snug text-theme-muted">What is on the ≥ path stays and always runs. The &lt; path is removed with it.</p>
              </>
            ) : (
              <button type="button" onClick={addTarget} className="widget-control gap-1.5 px-3 py-1.5 text-xs font-bold">
                <PlusIcon className="h-3.5 w-3.5" /> Set a target number
              </button>
            )}
          </div>
        )}
        <DataChips
          owner="available"
          title="Data you can use here"
          groups={getAvailableData(draft, { effectId: effect.id })}
          hint="Click one to add it where you were typing."
          chips={chips}
        />
        {resultName && (
          <DataChips
            owner="result"
            title="Passes along"
            groups={[{ title: '', items: outputs.map((output) => ({ ref: `@${resultLabel(resultName, output.key)}`, label: output.label })) }]}
            hint="Conditions and effects that come later can use these."
            chips={chips}
          />
        )}
        {effect.kind && <Sentence icon={getEventIcon(effect.kind, findWidget(character, effect.widgetId))} text={describeEffect(character, effect)} />}
        {showProblems && <ProblemList problems={[...(problems.effects[effect.id] ?? []), ...(branch ? problems.conditions[branch.id] ?? [] : [])]} />}
      </section>
    );
  }

  return <div className="event-inspector p-3 sm:p-4" onFocus={handleFocus}>{content}</div>;
}
