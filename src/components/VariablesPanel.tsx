import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { useVariablesPanelStore } from '../store/useVariablesPanelStore';
import type { Character, CharacterVariable } from '../types';
import {
  buildReferenceIndex,
  collectLabelEntries,
  getLabelReferences,
  getMissingLabels,
  LABEL_PATTERN,
  parseVariableValue,
  sanitizeLabelInput,
  suggestVariableLabel,
  validateLabelName,
  type LabelEntry,
  type LabelNameError,
  type LabelReference,
} from '../utils/characterVariables';
import { DEFAULT_VARIABLE_GROUP_ID, DEFAULT_VARIABLE_GROUP_NAME, getVariableGroups } from '../utils/variableGroups';
import {
  collectLabels,
  detectCircularReference,
  evaluateFormulaValue,
  hasUnresolvedRefs,
} from '../utils/formulaEngine';
import { extractFormulaLabelReferences, type FormulaLabels, type FormulaValue } from '../utils/formulaSyntax';
import { FormulaEditorDialog } from './FormulaEditorDialog';
import { Tooltip } from './Tooltip';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  GripVerticalIcon,
  LayersIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  XIcon,
} from './icons';

type Filter = 'all' | 'custom' | 'unused' | 'missing';

interface PanelEntry extends LabelEntry {
  key: string;
  references: LabelReference[];
  referenceCount: number;
  duplicateCount: number;
}

interface EntryGroup {
  key: string;
  title: string;
  subtitle?: string;
  widgetId?: string;
  sheetId?: string;
  /** Set for sections of standalone variables. */
  variableGroupId?: string;
  entries: PanelEntry[];
}

interface DropTarget {
  groupId: string;
  /** Variable to insert before; null appends to the section. */
  beforeId: string | null;
}

interface VariablesPanelProps {
  onRevealWidget: (sheetId: string, widgetId: string) => void;
}

const SIZE_STORAGE_KEY = 'ucs-variables-panel-size';
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const BOTTOM_LAYOUT_QUERY = '(max-width: 639px)';
const HOVER_CLASS = 'variables-hover-target';

const NAME_ERRORS: Record<LabelNameError, string> = {
  empty: 'Enter a name.',
  invalid: 'Start with a letter or underscore.',
  taken: 'Another value already uses this label.',
};

const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-border px-2.5 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';
const primaryButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-accent bg-theme-accent px-3 text-xs font-bold font-body text-theme-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'h-9 w-full rounded-button border border-theme-border bg-theme-background px-2.5 text-sm font-body text-theme-ink placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40';

function loadPanelSize(): { width: number; height: number | null } {
  try {
    const data = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY) || '{}');
    return {
      width: typeof data.width === 'number' ? data.width : DEFAULT_WIDTH,
      height: typeof data.height === 'number' ? data.height : null,
    };
  } catch {
    return { width: DEFAULT_WIDTH, height: null };
  }
}

function useIsBottomLayout(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(BOTTOM_LAYOUT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(BOTTOM_LAYOUT_QUERY);
    const update = () => setMatches(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return matches;
}

function highlightWidget(widgetId: string | null) {
  document.querySelectorAll(`.${HOVER_CLASS}`).forEach((element) => element.classList.remove(HOVER_CLASS));
  if (!widgetId) return;
  document.querySelectorAll(`[data-widget-id="${CSS.escape(widgetId)}"]`).forEach((element) => element.classList.add(HOVER_CLASS));
}

function formatValue(value: FormulaValue | undefined) {
  if (value === undefined) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value === '' ? '""' : value;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query);
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-theme-accent/25 px-px text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function useValueChange(value: FormulaValue | undefined) {
  const previousRef = useRef(value);
  const [change, setChange] = useState<{ key: number; delta: string | null } | null>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (previous === value || previous === undefined || value === undefined) return;
    const delta = typeof previous === 'number' && typeof value === 'number'
      ? `${value > previous ? '+' : '−'}${formatValue(Math.abs(Math.round((value - previous) * 100) / 100))}`
      : null;
    setChange((current) => ({ key: (current?.key ?? 0) + 1, delta }));
  }, [value]);

  return change;
}

function ValueDelta({ change, className }: { change: { key: number; delta: string | null } | null; className: string }) {
  if (!change?.delta) return null;
  return (
    <span key={`delta-${change.key}`} className={`variables-value-delta pointer-events-none absolute font-body text-[10px] font-bold text-theme-accent ${className}`} aria-hidden="true">
      {change.delta}
    </span>
  );
}

/** Chip value that pops and floats its delta whenever it changes. */
function ChipValue({ value, generatedCount }: { value: FormulaValue | undefined; generatedCount?: number }) {
  const change = useValueChange(value);
  const content = generatedCount !== undefined
    ? `${generatedCount} ${generatedCount === 1 ? 'value' : 'values'}`
    : formatValue(value);
  return (
    <span className="relative min-w-0 shrink">
      <span
        key={change?.key ?? 0}
        className={`inline-block max-w-[8rem] truncate align-bottom font-semibold tabular-nums ${change ? 'variables-value-flash' : ''} ${typeof value === 'string' || generatedCount !== undefined ? 'font-normal italic' : ''}`}
      >
        {content}
      </span>
      <ValueDelta change={change} className="-top-4 right-0" />
    </span>
  );
}

/** Prominent value display that pops and floats its delta whenever the value changes. */
function DetailValue({ value, generatedCount }: { value: FormulaValue | undefined; generatedCount?: number }) {
  const change = useValueChange(value);
  if (generatedCount !== undefined) {
    return <span className="text-sm italic text-theme-muted font-body">{generatedCount} {generatedCount === 1 ? 'value' : 'values'}</span>;
  }
  const isText = typeof value === 'string';
  return (
    <span className="relative inline-flex min-w-0 max-w-full">
      <span
        key={change?.key ?? 0}
        className={`truncate font-mono text-sm tabular-nums text-theme-ink ${isText ? 'italic' : 'font-semibold'} ${change ? 'variables-value-flash' : ''}`}
        title={isText ? value : undefined}
      >
        {formatValue(value)}
      </span>
      <ValueDelta change={change} className="-right-6 -top-2" />
    </span>
  );
}

const stepButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper';

/** Input-styled value for literal standalone variables, with −/+ steppers for numbers. */
function EditableValue({ value, editing, onStartEdit, onCommit, onCancelEdit }: {
  value: CharacterVariable['value'];
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (value: CharacterVariable['value']) => void;
  onCancelEdit: () => void;
}) {
  const change = useValueChange(value);
  const numeric = typeof value === 'number';
  return (
    <div className="flex items-center gap-1">
      {numeric && (
        <button type="button" onClick={() => onCommit(value - 1)} className={stepButtonClass} aria-label="Decrease value">
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
      )}
      {editing ? (
        <InlineValueEditor
          initial={String(value)}
          onCancel={onCancelEdit}
          onCommit={(draft) => {
            onCancelEdit();
            const next = parseVariableValue(draft);
            if (next !== value) onCommit(next);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          title="Click to edit"
          aria-label={`Edit value ${formatValue(value)}`}
          className="group/value relative flex h-7 min-w-[4.5rem] max-w-[12rem] items-center gap-2 rounded-button border border-theme-border bg-theme-background px-2 text-left transition-colors hover:border-theme-accent"
        >
          <span
            key={change?.key ?? 0}
            className={`min-w-0 flex-1 truncate font-mono text-xs tabular-nums text-theme-ink ${numeric ? 'font-semibold' : 'italic'} ${change ? 'variables-value-flash' : ''}`}
          >
            {formatValue(value)}
          </span>
          <PencilIcon className="h-3 w-3 shrink-0 text-theme-muted opacity-0 transition-opacity group-hover/value:opacity-100" aria-hidden="true" />
          <ValueDelta change={change} className="-top-4 right-1" />
        </button>
      )}
      {numeric && (
        <button type="button" onClick={() => onCommit(value + 1)} className={stepButtonClass} aria-label="Increase value">
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function InlineValueEditor({ initial, onCommit, onCancel }: { initial: string; onCommit: (value: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') onCommit(draft);
        if (event.key === 'Escape') onCancel();
        if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && draft.trim() !== '' && Number.isFinite(Number(draft))) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          setDraft(String(Number(draft) + (event.key === 'ArrowUp' ? step : -step)));
        }
      }}
      onBlur={() => onCommit(draft)}
      aria-label="Label value"
      className="h-7 w-24 shrink-0 rounded-button border border-theme-accent bg-theme-background px-2 font-mono text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-accent/40"
    />
  );
}

function LabelNameInput({ value, onChange, error, inputRef, onSubmit, onCancel, id }: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  inputRef?: React.RefObject<HTMLInputElement>;
  onSubmit: () => void;
  onCancel: () => void;
  id: string;
}) {
  return (
    <div>
      <div className={`flex h-9 items-center rounded-button border bg-theme-background focus-within:ring-2 focus-within:ring-theme-accent/40 ${error ? 'border-red-500' : 'border-theme-border'}`}>
        <span className="pl-2.5 font-mono text-sm text-theme-accent" aria-hidden="true">@</span>
        <input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(sanitizeLabelInput(event.target.value))}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') onSubmit();
            if (event.key === 'Escape') onCancel();
          }}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!!error}
          className="h-full min-w-0 flex-1 bg-transparent pl-0.5 pr-2.5 font-mono text-sm text-theme-ink placeholder:text-theme-muted focus:outline-none"
          placeholder="label"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500 font-body" role="alert">{error}</p>}
    </div>
  );
}

function ReferenceToggle({ count, checked, onChange }: { count: number; checked: boolean; onChange: (checked: boolean) => void }) {
  if (count === 0) return null;
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink font-body">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
      Update {count} {count === 1 ? 'reference' : 'references'}
    </label>
  );
}

interface VariableEditorProps {
  character: Character;
  labels: FormulaLabels;
  takenLabels: string[];
  variable?: CharacterVariable;
  initialLabel?: string;
  referenceCount: number;
  onSave: (draft: { label: string; value: CharacterVariable['value']; formula?: string; updateReferences: boolean }) => void;
  onCancel: () => void;
  className?: string;
}

function SectionNameInput({ initialName, onCommit, onCancel }: { initialName: string; onCommit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (commit) onCommit(name);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={name}
      maxLength={60}
      aria-label="Section name"
      onChange={(event) => setName(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      className="relative h-6 min-w-0 flex-1 rounded-button border border-theme-accent bg-theme-paper px-1.5 text-[11px] font-bold uppercase tracking-widest text-theme-ink font-heading focus:outline-none"
    />
  );
}

function VariableEditor({
  character, labels, takenLabels, variable, initialLabel, referenceCount, onSave, onCancel,
  className = 'animate-dropdown-in space-y-3 border-b border-theme-border bg-theme-background/60 px-4 py-3',
}: VariableEditorProps) {
  const [label, setLabel] = useState(variable?.label ?? initialLabel ?? suggestVariableLabel(takenLabels));
  const [mode, setMode] = useState<'value' | 'formula'>(variable?.formula ? 'formula' : 'value');
  const [valueDraft, setValueDraft] = useState(variable && !variable.formula ? String(variable.value) : '0');
  const [formula, setFormula] = useState(variable?.formula ?? '');
  const [updateReferences, setUpdateReferences] = useState(true);
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const initialLabelRef = useRef(label);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const nameError = validateLabelName(label, takenLabels, variable?.label);
  const visibleNameError = nameError && (touched || label !== initialLabelRef.current) ? NAME_ERRORS[nameError] : null;
  const trimmedFormula = formula.trim();
  const formulaStatus = useMemo(() => {
    if (mode !== 'formula') return null;
    if (!trimmedFormula) return { ok: false, message: 'Enter a formula, for example @level * 2' };
    if (LABEL_PATTERN.test(label)) {
      const cycle = detectCircularReference(label, trimmedFormula, character);
      if (cycle) return { ok: false, message: `Circular reference: ${cycle.map((item) => `@${item}`).join(' → ')}` };
    }
    if (hasUnresolvedRefs(trimmedFormula, labels)) {
      const missing = (extractFormulaLabelReferences(trimmedFormula) ?? []).filter((ref) => !(ref in labels));
      return { ok: false, message: `Unknown ${missing.length === 1 ? 'label' : 'labels'}: ${missing.map((ref) => `@${ref}`).join(', ')}` };
    }
    const result = evaluateFormulaValue(trimmedFormula, labels);
    if (result === null) return { ok: false, message: 'This formula cannot be calculated.' };
    return { ok: true, message: formatValue(result), result };
  }, [character, label, labels, mode, trimmedFormula]);

  const renamed = !!variable && label !== variable.label;
  const canSave = !nameError && (mode === 'value' || !!formulaStatus?.ok);

  const save = () => {
    setTouched(true);
    if (!canSave) return;
    onSave({
      label,
      value: mode === 'formula' ? formulaStatus?.result ?? 0 : parseVariableValue(valueDraft),
      formula: mode === 'formula' ? trimmedFormula : undefined,
      updateReferences,
    });
  };

  return (
    <div
      className={className}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div>
          <label htmlFor="variable-name" className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading">Name</label>
          <LabelNameInput
            id="variable-name"
            value={label}
            onChange={setLabel}
            error={visibleNameError}
            inputRef={nameRef}
            onSubmit={save}
            onCancel={onCancel}
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading">Type</span>
          <div role="radiogroup" aria-label="Label type" className="flex h-9 overflow-hidden rounded-button border border-theme-border">
            {(['value', 'formula'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => setMode(option)}
                className={`px-3 text-xs font-body transition-colors ${mode === option ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:text-theme-ink'}`}
              >
                {option === 'value' ? 'Value' : 'Formula'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'value' ? (
        <div>
          <label htmlFor="variable-value" className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading">Value</label>
          <input
            id="variable-value"
            value={valueDraft}
            onChange={(event) => setValueDraft(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') onCancel();
            }}
            placeholder="Number or text"
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-[11px] text-theme-muted font-body">Numbers work in arithmetic; anything else is treated as text.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="variable-formula" className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading">Formula</label>
          <div className="flex gap-2">
            <input
              id="variable-formula"
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') save();
                if (event.key === 'Escape') onCancel();
              }}
              spellCheck={false}
              placeholder="ceil(@level / 4) + 1"
              className={`${inputClass} font-mono`}
            />
            <Tooltip content="Open formula editor">
              <button type="button" onClick={() => setFormulaDialogOpen(true)} className={`${buttonClass} h-9 w-9 shrink-0 px-0 italic font-semibold`} aria-label="Open formula editor">
                fx
              </button>
            </Tooltip>
          </div>
          {formulaStatus && (
            <p className={`mt-1 flex items-center gap-1.5 text-[11px] font-body ${formulaStatus.ok ? 'text-theme-ink' : 'text-red-500'}`} role="status">
              {formulaStatus.ok ? (
                <>
                  <span className="text-theme-muted">Result</span>
                  <span className="rounded-sm bg-theme-accent/15 px-1.5 font-mono font-bold text-theme-ink">{formulaStatus.message}</span>
                </>
              ) : formulaStatus.message}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {renamed ? <ReferenceToggle count={referenceCount} checked={updateReferences} onChange={setUpdateReferences} /> : <span />}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>
          <button type="button" onClick={save} disabled={!canSave} className={primaryButtonClass}>
            <CheckIcon className="h-3.5 w-3.5" /> {variable ? 'Save' : 'Create'}
          </button>
        </div>
      </div>

      {formulaDialogOpen && (
        <FormulaEditorDialog
          formula={formula}
          character={character}
          sourceLabels={label ? [label] : []}
          resultType="text"
          onApply={(next) => {
            setFormula(next);
            setFormulaDialogOpen(false);
          }}
          onClear={() => {
            setFormula('');
            setFormulaDialogOpen(false);
          }}
          onCancel={() => setFormulaDialogOpen(false)}
        />
      )}
    </div>
  );
}

function RenameForm({ entry, takenLabels, onSave, onCancel }: {
  entry: PanelEntry;
  takenLabels: string[];
  onSave: (label: string, updateReferences: boolean) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(entry.label);
  const [updateReferences, setUpdateReferences] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  const error = validateLabelName(label, takenLabels, entry.label);
  const submit = () => {
    if (error) return;
    if (label === entry.label) onCancel();
    else onSave(label, updateReferences);
  };
  return (
    <div className="animate-dropdown-in space-y-2.5" onClick={(event) => event.stopPropagation()}>
      <LabelNameInput id={`rename-${entry.key}`} value={label} onChange={setLabel} error={error && label !== entry.label ? NAME_ERRORS[error] : null} inputRef={inputRef} onSubmit={submit} onCancel={onCancel} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReferenceToggle count={entry.referenceCount} checked={updateReferences} onChange={setUpdateReferences} />
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>
          <button type="button" onClick={submit} disabled={!!error || label === entry.label} className={primaryButtonClass}>Rename</button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, onClick, onHover, tone = 'default', title }: {
  children: ReactNode;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  tone?: 'default' | 'warning';
  title?: string;
}) {
  const className = `inline-flex h-6 max-w-full items-center gap-1 rounded-button border px-2 text-[11px] font-body transition-colors ${
    tone === 'warning' ? 'border-amber-500/60 text-amber-500' : 'border-theme-border text-theme-ink'
  } ${onClick ? 'hover:border-theme-accent hover:bg-theme-accent hover:text-theme-paper' : ''}`;
  if (!onClick) return <span className={className} title={title}>{children}</span>;
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={className}
    >
      {children}
    </button>
  );
}

export default function VariablesPanel({ onRevealWidget }: VariablesPanelProps) {
  const isOpen = useVariablesPanelStore((state) => state.isOpen);
  const setOpen = useVariablesPanelStore((state) => state.setOpen);
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId) ?? null);
  const addVariable = useStore((state) => state.addVariable);
  const updateVariable = useStore((state) => state.updateVariable);
  const renameLabel = useStore((state) => state.renameLabel);
  const removeLabel = useStore((state) => state.removeLabel);
  const addVariableGroup = useStore((state) => state.addVariableGroup);
  const renameVariableGroup = useStore((state) => state.renameVariableGroup);
  const deleteVariableGroup = useStore((state) => state.deleteVariableGroup);
  const moveVariable = useStore((state) => state.moveVariable);
  const undo = useStore((state) => state.undo);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [valueEditingId, setValueEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ label?: string; groupId: string } | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [dragGhost, setDragGhost] = useState<{ entry: PanelEntry; width: number; x: number; y: number } | null>(null);
  const dragRef = useRef<object | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undoable: boolean } | null>(null);
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const isBottom = useIsBottomLayout();
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingScrollKeyRef = useRef<string | null>(null);
  const pendingLabelRef = useRef<string | null>(null);

  const labels = useMemo(() => (character ? collectLabels(character) : {}), [character]);
  const referenceIndex = useMemo(() => (character ? buildReferenceIndex(character) : null), [character]);
  const variableGroups = useMemo(() => (character ? getVariableGroups(character) : []), [character]);
  const groupNameById = useMemo(() => new Map(variableGroups.map((group) => [group.id, group.name])), [variableGroups]);

  const entries = useMemo<PanelEntry[]>(() => {
    if (!character || !referenceIndex) return [];
    const raw = collectLabelEntries(character, labels);
    const definitionCounts = new Map<string, number>();
    for (const entry of raw) definitionCounts.set(entry.label, (definitionCounts.get(entry.label) ?? 0) + 1);
    const seen = new Map<string, number>();
    return raw.map((entry) => {
      const base = `${entry.variableId ?? entry.widgetId}:${entry.kind}:${entry.label}`;
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      const references = getLabelReferences(referenceIndex, entry.label, entry.kind)
        .filter((reference) => reference.sourceId !== (entry.variableId ? `variable:${entry.variableId}` : ''));
      return {
        ...entry,
        key: occurrence ? `${base}:${occurrence}` : base,
        references,
        referenceCount: references.reduce((sum, reference) => sum + reference.count, 0),
        duplicateCount: definitionCounts.get(entry.label) ?? 1,
      };
    });
  }, [character, labels, referenceIndex]);

  const missingLabels = useMemo(
    () => (referenceIndex ? getMissingLabels(referenceIndex, entries, labels) : []),
    [entries, labels, referenceIndex],
  );
  const takenLabels = useMemo(() => Array.from(new Set([...entries.map((entry) => entry.label), ...Object.keys(labels)])), [entries, labels]);
  const entryByLabel = useMemo(() => {
    const map = new Map<string, PanelEntry>();
    for (const entry of entries) if (!map.has(entry.label)) map.set(entry.label, entry);
    return map;
  }, [entries]);

  const counts = useMemo(() => ({
    all: entries.length,
    custom: entries.filter((entry) => entry.kind === 'custom').length,
    unused: entries.filter((entry) => entry.referenceCount === 0).length,
    missing: missingLabels.length,
  }), [entries, missingLabels.length]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = useCallback((entry: PanelEntry) => {
    if (!normalizedQuery) return true;
    return [
      entry.label,
      `@${entry.label}`,
      entry.context,
      entry.widgetTitle ?? groupNameById.get(entry.variableGroupId ?? '') ?? DEFAULT_VARIABLE_GROUP_NAME,
      entry.sheetName ?? '',
      entry.formula ?? '',
      entry.value === undefined ? '' : String(entry.value),
    ].some((text) => text.toLowerCase().includes(normalizedQuery));
  }, [groupNameById, normalizedQuery]);

  const groups = useMemo<EntryGroup[]>(() => {
    if (filter === 'missing') return [];
    const visible = entries.filter((entry) => {
      if (filter === 'custom' && entry.kind !== 'custom') return false;
      if (filter === 'unused' && entry.referenceCount > 0) return false;
      return matchesQuery(entry);
    });
    const result: EntryGroup[] = [];

    const sections = creating && !variableGroups.some((group) => group.id === creating.groupId)
      ? [{ id: creating.groupId, name: DEFAULT_VARIABLE_GROUP_NAME }, ...variableGroups]
      : variableGroups;
    const showEmptySections = !normalizedQuery && (filter === 'all' || filter === 'custom');
    for (const section of sections) {
      const sectionEntries = visible.filter((entry) => entry.kind === 'custom' && entry.variableGroupId === section.id);
      if (sectionEntries.length === 0 && !showEmptySections && creating?.groupId !== section.id) continue;
      result.push({ key: `vg:${section.id}`, title: section.name, variableGroupId: section.id, entries: sectionEntries });
    }

    const byWidget = new Map<string, EntryGroup>();
    for (const entry of visible) {
      if (entry.kind === 'custom') continue;
      const key = entry.widgetId!;
      let group = byWidget.get(key);
      if (!group) {
        group = { key, title: entry.widgetTitle ?? 'Widget', subtitle: entry.sheetName, widgetId: entry.widgetId, sheetId: entry.sheetId, entries: [] };
        byWidget.set(key, group);
        result.push(group);
      }
      group.entries.push(entry);
    }
    return result;
  }, [creating, entries, filter, matchesQuery, normalizedQuery, variableGroups]);

  const visibleMissing = useMemo(
    () => missingLabels.filter((label) => !normalizedQuery || label.toLowerCase().includes(normalizedQuery)),
    [missingLabels, normalizedQuery],
  );
  const visibleCount = filter === 'missing' ? visibleMissing.length : groups.reduce((sum, group) => sum + group.entries.length, 0);
  const allGroupsCollapsed = groups.length > 0 && groups.every((group) => collapsedGroups.has(group.key));
  const showFilters = counts.all > 0 || counts.missing > 0;

  useEffect(() => {
    if (filter === 'missing' && missingLabels.length === 0) setFilter('all');
  }, [filter, missingLabels.length]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      highlightWidget(null);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setQuery('');
    setFilter('all');
    setExpandedKey(null);
    setRenamingKey(null);
    setConfirmDeleteKey(null);
    setEditingVariableId(null);
    setValueEditingId(null);
    setCreating(null);
    setRenamingGroupId(null);
    setConfirmDeleteGroupId(null);
    setToast(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (confirmDeleteKey) setConfirmDeleteKey(null);
      else if (confirmDeleteGroupId) setConfirmDeleteGroupId(null);
      else if (renamingKey) setRenamingKey(null);
      else if (creating) setCreating(null);
      else if (editingVariableId) setEditingVariableId(null);
      else if (query) setQuery('');
      else setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDeleteGroupId, confirmDeleteKey, creating, editingVariableId, isOpen, query, renamingKey, setOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!copiedLabel) return;
    const timer = window.setTimeout(() => setCopiedLabel(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedLabel]);

  useEffect(() => {
    const key = pendingScrollKeyRef.current;
    if (!key) return;
    pendingScrollKeyRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const chip = listRef.current?.querySelector<HTMLElement>(`[data-entry-key="${CSS.escape(key)}"]`);
      const detail = listRef.current?.querySelector<HTMLElement>(`[data-entry-detail="${CSS.escape(key)}"]`);
      (detail ?? chip)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      chip?.classList.remove('variables-row-focus');
      void chip?.offsetWidth;
      chip?.classList.add('variables-row-focus');
    });
    return () => window.cancelAnimationFrame(frame);
  });

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const focusEntry = useCallback((entry: PanelEntry) => {
    setQuery('');
    setFilter('all');
    setExpandedKey(entry.key);
    const groupKey = entry.kind === 'custom' ? `vg:${entry.variableGroupId ?? DEFAULT_VARIABLE_GROUP_ID}` : entry.widgetId ?? '';
    setCollapsedGroups((current) => {
      if (!current.has(groupKey)) return current;
      const next = new Set(current);
      next.delete(groupKey);
      return next;
    });
    pendingScrollKeyRef.current = entry.key;
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const copyLabel = useCallback((label: string) => {
    const text = `@${label}`;
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedLabel(label);
  }, []);

  const revealWidget = useCallback((sheetId: string | undefined, widgetId: string | undefined) => {
    if (!sheetId || !widgetId) return;
    highlightWidget(null);
    onRevealWidget(sheetId, widgetId);
    if (isBottom) setOpen(false);
  }, [isBottom, onRevealWidget, setOpen]);

  const openReference = useCallback((reference: LabelReference) => {
    if (reference.widgetId) {
      revealWidget(reference.sheetId, reference.widgetId);
      return;
    }
    const variableId = reference.sourceId.replace(/^variable:/, '');
    const entry = entries.find((item) => item.variableId === variableId);
    if (entry) focusEntry(entry);
  }, [entries, focusEntry, revealWidget]);

  const handleDelete = (entry: PanelEntry) => {
    removeLabel(entry.label);
    setConfirmDeleteKey(null);
    setExpandedKey(null);
    setToast({ message: entry.kind === 'custom' ? `Deleted @${entry.label}` : `Removed label @${entry.label}`, undoable: true });
  };

  const handleCreate = (draft: { label: string; value: CharacterVariable['value']; formula?: string }) => {
    const groupId = creating?.groupId;
    addVariable({
      label: draft.label,
      value: draft.value,
      ...(draft.formula ? { formula: draft.formula } : {}),
      ...(groupId && groupId !== DEFAULT_VARIABLE_GROUP_ID ? { groupId } : {}),
    });
    setCreating(null);
    if (filter !== 'all' && filter !== 'custom') setFilter('all');
    pendingLabelRef.current = draft.label;
    setToast({ message: `Created @${draft.label}`, undoable: true });
  };

  // Created or renamed labels get a new entry key once the store updates; select and reveal them then.
  useEffect(() => {
    const label = pendingLabelRef.current;
    if (!label) return;
    const entry = entries.find((item) => item.label === label);
    if (!entry) return;
    pendingLabelRef.current = null;
    focusEntry(entry);
  }, [entries, focusEntry]);

  const expandGroup = useCallback((key: string) => {
    setCollapsedGroups((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const startCreate = (label?: string, groupId: string = variableGroups[0]?.id ?? DEFAULT_VARIABLE_GROUP_ID) => {
    setEditingVariableId(null);
    setConfirmDeleteGroupId(null);
    if (filter !== 'all' && filter !== 'custom') setFilter('all');
    expandGroup(`vg:${groupId}`);
    setCreating({ label, groupId });
  };

  useEffect(() => {
    if (!creating) return;
    const frame = window.requestAnimationFrame(() => {
      listRef.current?.querySelector('[data-create-editor]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [creating]);

  const handleAddSection = () => {
    const id = addVariableGroup('New section');
    if (!id) return;
    setQuery('');
    if (filter !== 'all' && filter !== 'custom') setFilter('all');
    setRenamingGroupId(id);
  };

  const handleDeleteSection = (group: EntryGroup) => {
    if (!group.variableGroupId) return;
    const count = entries.filter((entry) => entry.kind === 'custom' && entry.variableGroupId === group.variableGroupId).length;
    deleteVariableGroup(group.variableGroupId);
    setConfirmDeleteGroupId(null);
    if (creating?.groupId === group.variableGroupId) setCreating(null);
    setToast({
      message: count ? `Deleted ${group.title} and ${count} ${count === 1 ? 'label' : 'labels'}` : `Deleted ${group.title}`,
      undoable: true,
    });
  };

  const findDropTarget = (x: number, y: number): DropTarget | null => {
    const element = document.elementFromPoint(x, y);
    const section = element instanceof Element ? element.closest<HTMLElement>('[data-drop-section]') : null;
    const groupId = section?.dataset.dropSection;
    if (!section || !groupId || !listRef.current?.contains(section)) return null;
    // Snap to the nearest chip on the pointer's row so gaps between chips don't jump to the end.
    let nearest: HTMLElement | null = null;
    let nearestDistance = Infinity;
    section.querySelectorAll<HTMLElement>('[data-drag-chip]').forEach((chip) => {
      const rect = chip.getBoundingClientRect();
      if (y < rect.top - 4 || y > rect.bottom + 4) return;
      const distance = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      if (distance < nearestDistance) {
        nearest = chip;
        nearestDistance = distance;
      }
    });
    const chip = nearest as HTMLElement | null;
    if (!chip) return { groupId, beforeId: null };
    const rect = chip.getBoundingClientRect();
    const beforeId = x > rect.left + rect.width / 2 ? chip.dataset.nextId || null : chip.dataset.variableId ?? null;
    return { groupId, beforeId };
  };

  const beginChipDrag = (event: React.PointerEvent<HTMLElement>, entry: PanelEntry) => {
    const chip = event.currentTarget.closest<HTMLElement>('[data-drag-chip]');
    if (event.button !== 0 || !chip || !entry.variableId || dragRef.current) return;
    const variableId = entry.variableId;
    const rect = chip.getBoundingClientRect();
    const drag = {
      variableId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      active: false,
      frame: 0,
      target: null as DropTarget | null,
    };
    dragRef.current = drag;

    const placeGhost = () => {
      if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`;
    };
    const updateTarget = () => {
      const target = findDropTarget(drag.x, drag.y);
      drag.target = target;
      setDropTarget((current) => (current?.groupId === target?.groupId && current?.beforeId === target?.beforeId ? current : target));
    };
    const autoScroll = () => {
      const list = listRef.current;
      if (list) {
        const rect = list.getBoundingClientRect();
        const edge = 48;
        const delta = drag.y < rect.top + edge
          ? -(rect.top + edge - drag.y)
          : drag.y > rect.bottom - edge ? drag.y - (rect.bottom - edge) : 0;
        if (delta) {
          list.scrollTop += Math.max(-18, Math.min(18, delta / 3));
          updateTarget();
        }
      }
      drag.frame = window.requestAnimationFrame(autoScroll);
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      window.cancelAnimationFrame(drag.frame);
      dragCleanupRef.current = null;
      dragRef.current = null;
      if (!drag.active) return;
      document.body.classList.remove('variables-dragging');
      // The click that follows pointerup must not toggle the chip.
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      if (commit && drag.target) {
        moveVariable(variableId, drag.target.groupId, drag.target.beforeId);
        expandGroup(`vg:${drag.target.groupId}`);
      }
      setDraggingId(null);
      setDropTarget(null);
      setDragGhost(null);
    };
    const onMove = (moveEvent: PointerEvent) => {
      drag.x = moveEvent.clientX;
      drag.y = moveEvent.clientY;
      if (!drag.active) {
        if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 5) return;
        drag.active = true;
        window.getSelection()?.removeAllRanges();
        document.body.classList.add('variables-dragging');
        setExpandedKey((current) => (current === entry.key ? null : current));
        setDraggingId(variableId);
        setDragGhost({ entry, width: rect.width, x: drag.x - drag.offsetX, y: drag.y - drag.offsetY });
        drag.frame = window.requestAnimationFrame(autoScroll);
      }
      moveEvent.preventDefault();
      placeGhost();
      updateTarget();
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape' || !drag.active) return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      finish(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    dragCleanupRef.current = () => finish(false);
  };

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const maxWidth = Math.max(MIN_WIDTH, Math.round(viewport.w * 0.9));
  const maxHeight = Math.max(MIN_HEIGHT, Math.round(viewport.h * 0.95));
  const effectiveWidth = Math.min(Math.max(panelSize.width, MIN_WIDTH), maxWidth);
  const effectiveHeight = Math.min(Math.max(panelSize.height ?? Math.round(viewport.h * 0.72), MIN_HEIGHT), maxHeight);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { x: event.clientX, y: event.clientY, width: effectiveWidth, height: effectiveHeight };
  };
  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start) return;
    if (isBottom) {
      const height = Math.min(Math.max(start.height + (start.y - event.clientY), MIN_HEIGHT), maxHeight);
      setPanelSize((size) => ({ ...size, height }));
    } else {
      const width = Math.min(Math.max(start.width + (start.x - event.clientX), MIN_WIDTH), maxWidth);
      setPanelSize((size) => ({ ...size, width }));
    }
  };
  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(panelSize));
    } catch {
      // Size persistence is best-effort.
    }
  };

  if (!isOpen || !character) return null;

  const variables = character.variables ?? [];
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'custom', label: 'Standalone', count: counts.custom },
    { id: 'unused', label: 'Unused', count: counts.unused },
    ...(counts.missing > 0 ? [{ id: 'missing' as const, label: 'Missing', count: counts.missing }] : []),
  ];

  const showNewSection = !normalizedQuery && (filter === 'all' || filter === 'custom');
  const renderNewSectionButton = (leading: boolean) => (
    <div key="new-section" data-tutorial={leading ? 'labels-standalone' : undefined} className={`px-4 pb-3 ${leading ? 'pt-3' : ''}`}>
      <button
        type="button"
        onClick={handleAddSection}
        className="variables-new-section flex h-7 w-full items-center justify-center gap-1.5 rounded-button text-[11px] font-semibold text-theme-muted transition-colors hover:text-theme-accent font-body"
      >
        <PlusIcon className="h-3 w-3" /> New section
      </button>
    </div>
  );
  const renderChip = (entry: PanelEntry, group: EntryGroup, index: number) => {
    const selected = expandedKey === entry.key;
    const sectionId = group.variableGroupId;
    const variableId = entry.variableId;
    const canDrag = Boolean(sectionId && variableId);
    const dragging = Boolean(variableId && draggingId === variableId);
    const unused = entry.referenceCount === 0;
    const duplicate = entry.duplicateCount > 1;
    const tone = selected
      ? 'variables-chip--selected'
      : `${duplicate ? 'variables-chip--duplicate' : ''} ${unused ? 'variables-chip--unused' : ''}`;
    const title = [
      entry.context,
      entry.formula ? `= ${entry.formula}` : null,
      unused ? 'Unused' : `${entry.referenceCount} ${entry.referenceCount === 1 ? 'use' : 'uses'}`,
      duplicate ? `Defined ${entry.duplicateCount} times` : null,
    ].filter(Boolean).join(' · ');
    const spokenValue = entry.generatedCount !== undefined
      ? `${entry.generatedCount} ${entry.generatedCount === 1 ? 'value' : 'values'}`
      : formatValue(entry.value);
    return (
      <div
        key={entry.key}
        role="listitem"
        className={`variables-chip-wrap min-w-0 max-w-full transition-opacity ${dragging ? 'opacity-40' : ''}`}
        data-drag-chip={canDrag ? '' : undefined}
        data-variable-id={canDrag ? variableId : undefined}
        data-next-id={canDrag ? group.entries[index + 1]?.variableId ?? '' : undefined}
      >
      <button
        type="button"
        data-entry-key={entry.key}
        aria-expanded={selected}
        aria-controls={selected ? `label-detail-${entry.key}` : undefined}
        aria-label={`@${entry.label} = ${spokenValue}`}
        title={title}
        onClick={() => {
          if (suppressClickRef.current) return;
          setExpandedKey(selected ? null : entry.key);
          setRenamingKey(null);
          setConfirmDeleteKey(null);
          setValueEditingId(null);
        }}
        onMouseEnter={() => highlightWidget(entry.widgetId ?? null)}
        onFocus={() => highlightWidget(entry.widgetId ?? null)}
        className={`variables-chip relative inline-flex h-7 max-w-full items-center gap-1.5 rounded-button ${canDrag ? 'pl-0.5 pr-2.5' : 'px-2.5'} font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent ${tone}`}
      >
        {canDrag && (
          <span
            className={`variables-chip-handle -mr-1 flex h-6 w-4 shrink-0 items-center justify-center rounded-sm ${selected ? 'opacity-70' : 'text-theme-muted'}`}
            aria-hidden="true"
            onPointerDown={(event) => beginChipDrag(event, entry)}
          >
            <GripVerticalIcon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="min-w-0 truncate">
          <span className={selected ? 'opacity-70' : 'text-theme-accent'}>@</span>
          <Highlight text={entry.label} query={normalizedQuery.replace(/^@/, '')} />
        </span>
        {entry.formula && (
          <span className={`shrink-0 font-body text-[10px] font-semibold italic ${selected ? 'opacity-70' : 'text-theme-muted'}`} aria-hidden="true">fx</span>
        )}
        <span className={`shrink-0 ${selected ? 'opacity-70' : 'text-theme-muted'}`} aria-hidden="true">=</span>
        <ChipValue value={entry.value} generatedCount={entry.generatedCount} />
      </button>
      </div>
    );
  };

  const renderDetail = (entry: PanelEntry) => {
    const variable = entry.variableId ? variables.find((item) => item.id === entry.variableId) : undefined;
    const literalVariable = variable && !variable.formula;
    const dependencies = entry.formula ? Array.from(new Set(extractFormulaLabelReferences(entry.formula) ?? [])) : [];

    if (variable && editingVariableId === variable.id) {
      return (
        <div className="mt-3" data-entry-detail={entry.key}>
          <VariableEditor
            className="variables-detail animate-dropdown-in space-y-3 rounded-button p-3.5"
            character={character}
            labels={labels}
            takenLabels={takenLabels}
            variable={variable}
            referenceCount={entry.referenceCount}
            onCancel={() => setEditingVariableId(null)}
            onSave={(draft) => {
              updateVariable(variable.id, { label: draft.label, value: draft.value, formula: draft.formula ?? '' }, { updateReferences: draft.updateReferences });
              setEditingVariableId(null);
              if (draft.label !== variable.label) {
                pendingLabelRef.current = draft.label;
              }
            }}
          />
        </div>
      );
    }

    const renaming = renamingKey === entry.key;
    const confirmingDelete = confirmDeleteKey === entry.key;
    const copied = copiedLabel === entry.label;
    const subtitle = entry.kind === 'custom'
      ? entry.formula ? 'Standalone formula' : 'Standalone label'
      : entry.context;
    const caption = 'text-[10px] font-bold uppercase tracking-wider text-theme-muted font-heading';
    const actions: { key: string; label: string; icon: ReactNode; onClick: () => void }[] = [
      {
        key: 'copy',
        label: copied ? 'Copied' : 'Copy',
        icon: copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />,
        onClick: () => copyLabel(entry.label),
      },
    ];
    if (entry.widgetId) {
      actions.push({ key: 'reveal', label: 'Go to widget', icon: <ArrowRightIcon className="h-3.5 w-3.5" />, onClick: () => revealWidget(entry.sheetId, entry.widgetId) });
    }
    if (entry.editable) {
      actions.push({
        key: 'edit',
        label: variable ? 'Edit' : 'Rename',
        icon: <PencilIcon className="h-3.5 w-3.5" />,
        onClick: () => {
          if (variable) setEditingVariableId(variable.id);
          else setRenamingKey(entry.key);
        },
      });
    }

    return (
      <div
        id={`label-detail-${entry.key}`}
        data-entry-detail={entry.key}
        className="variables-detail animate-dropdown-in mt-2.5 space-y-3 rounded-button p-3"
        onMouseEnter={() => highlightWidget(entry.widgetId ?? null)}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-mono text-sm font-semibold text-theme-ink">
            <span className="text-theme-accent">@</span>{entry.label}
          </span>
          <span className="min-w-0 truncate text-[11px] text-theme-muted font-body"><Highlight text={subtitle} query={normalizedQuery} /></span>
          {entry.duplicateCount > 1 && (
            <span className="shrink-0 rounded-sm border border-amber-500/60 px-1 text-[10px] leading-4 text-amber-500 font-body" title={`Defined ${entry.duplicateCount} times; formulas use only one of them.`}>
              duplicate
            </span>
          )}
        </div>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2.5">
          <dt className={caption}>Value</dt>
          <dd className="min-w-0">
            {literalVariable ? (
              <EditableValue
                key={entry.key}
                value={variable.value}
                editing={valueEditingId === variable.id}
                onStartEdit={() => setValueEditingId(variable.id)}
                onCancelEdit={() => setValueEditingId(null)}
                onCommit={(value) => updateVariable(variable.id, { value })}
              />
            ) : (
              <DetailValue key={entry.key} value={entry.value} generatedCount={entry.generatedCount} />
            )}
          </dd>

          {entry.formula && (
            <>
              <dt className={caption}>Formula</dt>
              <dd className="min-w-0">
                <code className="break-words font-mono text-xs leading-5 text-theme-ink">{entry.formula}</code>
              </dd>
            </>
          )}

          {dependencies.length > 0 && (
            <>
              <dt className={caption}>Reads</dt>
              <dd className="flex min-w-0 flex-wrap gap-1.5">
                {dependencies.map((dependency) => {
                  const target = entryByLabel.get(dependency);
                  return (
                    <Chip
                      key={dependency}
                      tone={target || dependency in labels ? 'default' : 'warning'}
                      onClick={target ? () => focusEntry(target) : undefined}
                      onHover={(hovering) => highlightWidget(hovering ? target?.widgetId ?? null : entry.widgetId ?? null)}
                      title={target ? `Show @${dependency}` : dependency in labels ? undefined : 'Not defined'}
                    >
                      <span className="font-mono">@{dependency}</span>
                      {target && (
                        <span className="opacity-60">
                          {target.generatedCount !== undefined ? `${target.generatedCount} values` : formatValue(target.value)}
                        </span>
                      )}
                    </Chip>
                  );
                })}
              </dd>
            </>
          )}

          <dt className={caption}>Used by</dt>
          <dd className="flex min-w-0 flex-wrap gap-1.5">
            {entry.references.length === 0 ? (
              <span className="text-xs text-theme-muted font-body">
                Nothing yet. Type <code className="font-mono text-theme-ink">@{entry.label}</code> in any formula.
              </span>
            ) : (
              entry.references.map((reference) => (
                <Chip
                  key={reference.sourceId}
                  onClick={() => openReference(reference)}
                  onHover={(hovering) => highlightWidget(hovering ? reference.widgetId ?? null : entry.widgetId ?? null)}
                  title={reference.widgetId ? `Go to ${reference.title}${reference.sheetName ? ` (${reference.sheetName})` : ''}` : `Show ${reference.title}`}
                >
                  <span className={`truncate ${reference.widgetId ? '' : 'font-mono'}`}>{reference.title}</span>
                  {reference.count > 1 && <span className="opacity-70">×{reference.count}</span>}
                </Chip>
              ))
            )}
          </dd>

          {variable && variableGroups.length > 1 && (
            <>
              <dt className={caption}><label htmlFor={`variable-section-${variable.id}`}>Section</label></dt>
              <dd className="min-w-0">
                <select
                  id={`variable-section-${variable.id}`}
                  value={entry.variableGroupId ?? DEFAULT_VARIABLE_GROUP_ID}
                  onChange={(event) => {
                    moveVariable(variable.id, event.target.value);
                    setExpandedKey(entry.key);
                    expandGroup(`vg:${event.target.value}`);
                    pendingScrollKeyRef.current = entry.key;
                  }}
                  className="h-7 max-w-full rounded-button border border-theme-border bg-theme-paper px-2 text-xs text-theme-ink font-body focus:border-theme-accent focus:outline-none"
                >
                  {variableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </dd>
            </>
          )}
        </dl>

        {renaming ? (
          <RenameForm
            entry={entry}
            takenLabels={takenLabels}
            onCancel={() => setRenamingKey(null)}
            onSave={(label, updateReferences) => {
              renameLabel(entry.label, label, updateReferences);
              setRenamingKey(null);
              pendingLabelRef.current = label;
              setToast({ message: `Renamed @${entry.label} to @${label}`, undoable: true });
            }}
          />
        ) : confirmingDelete ? (
          <div className="animate-dropdown-in rounded-button border border-red-500/60 bg-red-500/10 p-2.5" role="alert">
            <p className="text-xs text-theme-ink font-body">
              <span className="font-bold">{entry.kind === 'custom' ? `Delete @${entry.label}?` : `Remove the label @${entry.label}?`}</span>{' '}
              <span className="text-theme-muted">
                {entry.kind === 'custom'
                  ? 'The label will be removed from this character.'
                  : `The value stays in ${entry.widgetTitle}; only its label is removed.`}
                {entry.referenceCount > 0 && ` ${entry.referenceCount} ${entry.referenceCount === 1 ? 'reference' : 'references'} will stop working.`}
              </span>
            </p>
            <div className="mt-2.5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteKey(null)} className={`${buttonClass} h-7`}>Cancel</button>
              <button type="button" onClick={() => handleDelete(entry)} className="inline-flex h-7 items-center gap-1.5 rounded-button border border-red-500 bg-red-500 px-3 text-xs font-bold text-white font-body transition-colors hover:bg-red-600">
                <TrashIcon className="h-3.5 w-3.5" /> {entry.kind === 'custom' ? 'Delete' : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-button border border-theme-border">
              {actions.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`inline-flex h-7 items-center gap-1 px-2 text-xs text-theme-ink font-body transition-colors hover:bg-theme-accent hover:text-theme-paper ${index > 0 ? 'border-l border-theme-border' : ''}`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            {entry.editable ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteKey(entry.key)}
                aria-label={entry.kind === 'custom' ? 'Delete' : 'Remove'}
                title={isBottom ? (entry.kind === 'custom' ? 'Delete' : 'Remove') : undefined}
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-button px-2 text-xs text-theme-muted font-body transition-colors hover:bg-red-500 hover:text-white"
              >
                <TrashIcon className="h-3.5 w-3.5" /> {!isBottom && (entry.kind === 'custom' ? 'Delete' : 'Remove')}
              </button>
            ) : (
              <span className="ml-auto text-[11px] text-theme-muted font-body">Rename this {entry.context.toLowerCase()} in its widget.</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      id="variables-panel"
      data-tutorial="labels-panel"
      data-touch-camera-panel="true"
      aria-labelledby="variables-title"
      className={`variables-panel fixed z-40 flex flex-col overflow-hidden bg-theme-paper text-theme-ink border-theme-border shadow-2xl touch-pan-y ${
        isBottom
          ? 'variables-panel--bottom inset-x-0 bottom-0 border-t-[length:var(--border-width)]'
          : 'right-0 top-0 bottom-0 border-l-[length:var(--border-width)]'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(isBottom ? { height: effectiveHeight } : { width: effectiveWidth }),
      }}
    >
      <div
        role="separator"
        aria-orientation={isBottom ? 'horizontal' : 'vertical'}
        aria-label="Resize labels panel"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={`absolute z-20 touch-none transition-colors hover:bg-theme-accent/40 active:bg-theme-accent/60 ${
          isBottom ? 'inset-x-0 top-0 h-2 cursor-row-resize' : 'inset-y-0 left-0 w-2 cursor-col-resize'
        }`}
      />

      <div className={`flex flex-shrink-0 justify-between gap-4 px-4 ${showFilters ? '' : 'border-b-[length:var(--border-width)] border-theme-border'} ${isBottom ? 'items-center py-2' : 'items-start py-3'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-button bg-theme-accent/15 text-theme-accent sm:flex" aria-hidden="true">
            <TagIcon className="h-5 w-5" />
          </span>
          <h2 id="variables-title" className="min-w-0 truncate font-heading text-lg font-bold leading-tight text-theme-ink">Labels</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button type="button" onClick={() => startCreate()} className={`${primaryButtonClass} h-9`} aria-label="Create new label">
            <PlusIcon className="h-4 w-4" /> <span>Create new label</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
            aria-label="Close labels"
            title="Close labels"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={`flex-shrink-0 space-y-2.5 border-b border-theme-border px-4 ${isBottom ? 'pb-2' : 'pb-3 pt-1'}`}>
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search labels, widgets, values"
              aria-label="Search labels"
              className={`${inputClass} pl-8 pr-9 [&::-webkit-search-cancel-button]:appearance-none`}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-theme-muted hover:text-theme-ink">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
          <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Filter labels" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {filters.map((item) => {
              const active = filter === item.id;
              const warning = item.id === 'missing';
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-body transition-colors ${
                    active
                      ? warning ? 'border-amber-500 bg-amber-500 text-white' : 'border-theme-accent bg-theme-accent text-theme-paper'
                      : warning ? 'border-amber-500/60 text-amber-500 hover:bg-amber-500/10' : 'border-theme-border text-theme-muted hover:text-theme-ink'
                  }`}
                >
                  {item.label}
                  <span className={`tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>{item.count}</span>
                </button>
              );
            })}
          </div>
          {filter !== 'missing' && groups.length > 1 && !normalizedQuery && (
            <Tooltip content={allGroupsCollapsed ? 'Expand all' : 'Collapse all'}>
              <button
                type="button"
                onClick={() => setCollapsedGroups(allGroupsCollapsed ? new Set() : new Set(groups.map((group) => group.key)))}
                aria-label={allGroupsCollapsed ? 'Expand all widgets' : 'Collapse all widgets'}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
              >
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${allGroupsCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </Tooltip>
          )}
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        onMouseLeave={() => highlightWidget(null)}
      >
        {counts.all === 0 && counts.missing === 0 && groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-theme-accent/15 text-theme-accent" aria-hidden="true">
              <TagIcon className="h-6 w-6" />
            </span>
            <p className="font-heading text-base font-bold text-theme-ink">No labels yet</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-theme-muted font-body">
              Give a widget value a label, or create a standalone label like <code className="font-mono text-theme-ink">@proficiency</code> to reuse it in any formula.
            </p>
            <button type="button" onClick={() => startCreate()} className={`${primaryButtonClass} mt-4 h-9`}>
              <PlusIcon className="h-4 w-4" /> Create new label
            </button>
          </div>
        ) : groups.length === 0 && filter === 'custom' && !normalizedQuery ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <p className="font-heading text-base font-bold text-theme-ink">No standalone labels yet</p>
            <p className="mt-2 max-w-[18rem] text-sm text-theme-muted font-body">
              Standalone labels are not tied to any widget. Use them for bonuses, modifiers or constants in any formula.
            </p>
            <button type="button" onClick={() => startCreate()} className={`${primaryButtonClass} mt-4 h-9`}>
              <PlusIcon className="h-4 w-4" /> Create new label
            </button>
          </div>
        ) : visibleCount === 0 && groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <p className="font-heading text-base font-bold text-theme-ink">No matching labels</p>
            <p className="mt-2 text-sm text-theme-muted font-body">Try another search or filter.</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setFilter('all'); }}
              className={`${buttonClass} mt-4 h-9`}
            >
              Reset filters
            </button>
          </div>
        ) : filter === 'missing' ? (
          <section aria-labelledby="variables-missing-title">
            <div className="sticky top-0 z-10 border-b border-theme-border bg-theme-paper px-4 py-2">
              <h3 id="variables-missing-title" className="text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading">Used but not defined</h3>
            </div>
            <div role="list">
              {visibleMissing.map((label) => {
                const references = referenceIndex ? getLabelReferences(referenceIndex, label, 'field') : [];
                return (
                  <div key={label} role="listitem" className="border-b border-theme-border/60 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-amber-500">@{label}</span>
                      <button type="button" onClick={() => startCreate(label)} className={buttonClass}>
                        <PlusIcon className="h-3.5 w-3.5" /> Create
                      </button>
                    </div>
                    {references.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {references.map((reference) => (
                          <Chip
                            key={reference.sourceId}
                            onClick={() => openReference(reference)}
                            onHover={(hovering) => highlightWidget(hovering ? reference.widgetId ?? null : null)}
                          >
                            <span className="truncate">{reference.title}</span>
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            {groups.map((group) => {
              const collapsed = !normalizedQuery && collapsedGroups.has(group.key);
              const selectedEntry = group.entries.find((entry) => entry.key === expandedKey);
              const sectionId = group.variableGroupId;
              const isDropSection = Boolean(draggingId && sectionId && dropTarget?.groupId === sectionId);
              const sectionTotal = sectionId ? entries.filter((entry) => entry.kind === 'custom' && entry.variableGroupId === sectionId).length : 0;
              const showCreate = Boolean(sectionId && creating?.groupId === sectionId);
              const draggedIndex = draggingId ? group.entries.findIndex((entry) => entry.variableId === draggingId) : -1;
              const showBarAt = (index: number) => {
                if (!isDropSection) return false;
                const beforeId = index < group.entries.length ? group.entries[index].variableId ?? null : null;
                if (dropTarget?.beforeId !== beforeId) return false;
                return draggedIndex === -1 || (index !== draggedIndex && index !== draggedIndex + 1);
              };
              const dropBar = <span key="drop-bar" className="variables-drop-bar" aria-hidden="true" />;
              return (
                <section
                  key={group.key}
                  aria-label={group.title}
                  onMouseLeave={() => highlightWidget(null)}
                  className={isDropSection ? 'variables-section--drop' : undefined}
                  data-drop-section={sectionId}
                  data-tutorial={sectionId && sectionId === groups[0]?.variableGroupId ? 'labels-standalone' : undefined}
                >
                  <div
                    className="group/header sticky top-0 z-10 flex items-center gap-1 bg-theme-paper pb-2 pl-4 pr-4 pt-3 text-theme-muted"
                    onMouseEnter={() => highlightWidget(group.widgetId ?? null)}
                  >
                    {/* Full-row toggle sits behind the title so the header buttons can follow the name. */}
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.title}`}
                      onClick={() => toggleGroup(group.key)}
                      className="peer absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theme-accent"
                    />
                    {sectionId && renamingGroupId === sectionId ? (
                      <SectionNameInput
                        initialName={group.title}
                        onCommit={(name) => {
                          renameVariableGroup(sectionId, name);
                          setRenamingGroupId(null);
                        }}
                        onCancel={() => setRenamingGroupId(null)}
                      />
                    ) : (
                      <h3 className="pointer-events-none relative min-w-0 truncate text-[11px] font-bold uppercase tracking-widest text-theme-ink font-heading">{group.title}</h3>
                    )}
                    {group.subtitle && (
                      <span className="pointer-events-none relative ml-1.5 flex min-w-0 items-center gap-1 text-[11px] opacity-80 font-body">
                        <LayersIcon className="h-3 w-3 shrink-0 -translate-y-px" aria-hidden="true" />
                        <span className="truncate">{group.subtitle}</span>
                      </span>
                    )}
                    {group.widgetId && (
                      <Tooltip content="Go to widget">
                        <button
                          type="button"
                          onClick={() => revealWidget(group.sheetId, group.widgetId)}
                          className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-button text-theme-muted opacity-0 transition hover:bg-theme-accent hover:text-theme-paper focus:opacity-100 group-hover/header:opacity-100"
                          aria-label={`Go to ${group.title}`}
                        >
                          <ArrowRightIcon className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    )}
                    {sectionId && renamingGroupId !== sectionId && (
                      <Tooltip content="Rename section">
                        <button
                          type="button"
                          onClick={() => { setConfirmDeleteGroupId(null); setRenamingGroupId(sectionId); }}
                          className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-button text-theme-muted opacity-0 transition hover:bg-theme-accent hover:text-theme-paper focus:opacity-100 group-hover/header:opacity-100 [@media(hover:none)]:opacity-100"
                          aria-label={`Rename ${group.title}`}
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    )}
                    {sectionId && (
                      <span className="relative ml-auto flex shrink-0 items-center gap-1 pl-2">
                        <Tooltip content="Delete section">
                          <button
                            type="button"
                            onClick={() => {
                              if (sectionTotal === 0) handleDeleteSection(group);
                              else setConfirmDeleteGroupId(confirmDeleteGroupId === sectionId ? null : sectionId);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-button text-theme-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 group-hover/header:opacity-100 [@media(hover:none)]:opacity-100"
                            aria-label={`Delete ${group.title}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <button
                          type="button"
                          onClick={() => startCreate(undefined, sectionId)}
                          className="flex h-6 items-center gap-1 rounded-button px-1.5 text-[11px] font-semibold text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper font-body"
                          aria-label={`Add label to ${group.title}`}
                        >
                          <PlusIcon className="h-3 w-3" /> Add
                        </button>
                      </span>
                    )}
                    <ChevronDownIcon className={`pointer-events-none relative h-3.5 w-3.5 shrink-0 transition-[transform,color] duration-200 peer-hover:text-theme-ink ${sectionId ? 'ml-1' : 'ml-auto'} ${collapsed ? '-rotate-90' : ''}`} aria-hidden="true" />
                  </div>
                  {sectionId && confirmDeleteGroupId === sectionId && (
                    <div role="alert" className="animate-dropdown-in mx-4 mb-3 flex items-center gap-3 rounded-button border border-red-500/40 bg-red-500/10 px-3 py-2">
                      <span className="min-w-0 flex-1 text-xs text-theme-ink font-body">
                        Delete <strong>{group.title}</strong> and its {sectionTotal} {sectionTotal === 1 ? 'label' : 'labels'}?
                      </span>
                      <button type="button" onClick={() => setConfirmDeleteGroupId(null)} className={`${buttonClass} h-7`}>Cancel</button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(group)}
                        className="flex h-7 items-center rounded-button bg-red-500 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 font-body"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {!collapsed && (
                    <div className="px-4 pb-3">
                      {sectionId && sectionId === groups[0]?.variableGroupId && (
                        <p className="-mt-1 mb-2.5 truncate text-[11px] text-theme-muted font-body">
                          Labels here are not tied to any widget. Use them in any formula.
                        </p>
                      )}
                      {group.entries.length > 0 ? (
                        <div role="list" className="flex flex-wrap gap-2">
                          {group.entries.flatMap((entry, index) => (showBarAt(index) ? [dropBar, renderChip(entry, group, index)] : [renderChip(entry, group, index)]))}
                          {showBarAt(group.entries.length) && dropBar}
                        </div>
                      ) : sectionId && !showCreate && (
                        <p className={`variables-empty-section rounded-button px-3 py-2 text-xs text-theme-muted font-body ${isDropSection ? 'variables-empty-section--active' : ''}`}>
                          {draggingId ? 'Drop here' : 'Empty. Add a label or drag one here.'}
                        </p>
                      )}
                      {selectedEntry && renderDetail(selectedEntry)}
                      {showCreate && creating && (
                        <div data-create-editor className={group.entries.length > 0 ? 'mt-2.5' : undefined}>
                          <VariableEditor
                            className="variables-detail animate-dropdown-in space-y-3 rounded-button p-3.5"
                            character={character}
                            labels={labels}
                            takenLabels={takenLabels}
                            initialLabel={creating.label}
                            referenceCount={0}
                            onCancel={() => setCreating(null)}
                            onSave={handleCreate}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            }).flatMap((section, index) => {
              if (!showNewSection) return [section];
              if (index === 0 && !groups[0].variableGroupId) return [renderNewSectionButton(true), section];
              if (groups[index].variableGroupId && !groups[index + 1]?.variableGroupId) return [section, renderNewSectionButton(false)];
              return [section];
            })}
          </>
        )}
      </div>

      {dragGhost && createPortal(
        <div
          ref={ghostRef}
          className="variables-drag-ghost"
          style={{ width: dragGhost.width, transform: `translate3d(${dragGhost.x}px, ${dragGhost.y}px, 0)` }}
          aria-hidden="true"
        >
          <span className="variables-chip variables-drag-ghost__chip inline-flex h-7 max-w-full items-center gap-1.5 rounded-button pl-0.5 pr-2.5 font-mono text-xs">
            <span className="-mr-1 flex h-6 w-4 shrink-0 items-center justify-center text-theme-accent"><GripVerticalIcon className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 truncate"><span className="text-theme-accent">@</span>{dragGhost.entry.label}</span>
            {dragGhost.entry.formula && <span className="shrink-0 font-body text-[10px] font-semibold italic text-theme-muted">fx</span>}
            <span className="shrink-0 text-theme-muted">=</span>
            <ChipValue value={dragGhost.entry.value} generatedCount={dragGhost.entry.generatedCount} />
          </span>
        </div>,
        document.body,
      )}

      {toast && (
        <div className="timeline-toast flex flex-shrink-0 items-center gap-3 border-t border-theme-border bg-theme-accent px-4 py-2.5 text-theme-paper" role="status" aria-live="polite">
          <span className="min-w-0 flex-1 truncate text-sm font-body">{toast.message}</span>
          {toast.undoable && (
            <button
              type="button"
              onClick={() => {
                undo();
                setToast(null);
              }}
              className="h-8 rounded-button border border-current px-3 text-xs font-bold font-body transition-opacity hover:opacity-80"
            >
              Undo
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} className="flex h-8 w-8 items-center justify-center rounded-button transition-opacity hover:opacity-80" aria-label="Dismiss message">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
