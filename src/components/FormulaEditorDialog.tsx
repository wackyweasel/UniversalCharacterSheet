import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../types';
import {
  collectLabels,
  detectCircularReference,
  evaluateFormula,
  getAvailableLabels,
  hasUnresolvedRefs,
} from '../utils/formulaEngine';
import {
  FORMULA_REFERENCE,
  FORMULA_REFERENCE_CATEGORIES,
  type FormulaReferenceCategory,
} from '../utils/formulaReference';
import { SearchIcon, XIcon } from './icons';

interface FormulaEditorDialogProps {
  formula?: string;
  character?: Character;
  sourceLabels?: string[];
  excludedLabels?: string[];
  selfReferenceMessage?: string;
  tutorialTargetPrefix?: string;
  highlightApply?: boolean;
  onApply: (formula: string) => void;
  onClear?: () => void;
  onCancel: () => void;
}

type MobilePanel = 'labels' | 'reference';

interface FormulaStatus {
  kind: 'empty' | 'valid' | 'invalid' | 'unresolved' | 'self' | 'circular';
  message: string;
  result: number | null;
}

export function FormulaEditorDialog({
  formula,
  character,
  sourceLabels = [],
  excludedLabels = [],
  selfReferenceMessage,
  tutorialTargetPrefix,
  highlightApply = false,
  onApply,
  onClear,
  onCancel,
}: FormulaEditorDialogProps) {
  const [draft, setDraft] = useState(formula || '');
  const [labelSearch, setLabelSearch] = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('labels');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const referenceDetailRef = useRef<HTMLDivElement>(null);

  const labels = useMemo(() => character ? collectLabels(character) : {}, [character]);
  const sourceLabelSet = useMemo(() => new Set(sourceLabels), [sourceLabels]);
  const excludedLabelSet = useMemo(
    () => new Set([...sourceLabels, ...excludedLabels]),
    [excludedLabels, sourceLabels]
  );

  const circularPath = useMemo(() => {
    if (!character || !draft.trim()) return null;
    for (const sourceLabel of sourceLabels) {
      const path = detectCircularReference(sourceLabel, draft, character);
      if (path) return path;
    }
    return null;
  }, [character, draft, sourceLabels]);

  const status = useMemo<FormulaStatus>(() => {
    if (!draft.trim()) {
      return { kind: 'empty', message: 'Enter a formula to see its result.', result: null };
    }

    const references = draft.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    const selfReference = references.find((reference) => sourceLabelSet.has(reference.slice(1)));
    if (selfReference) {
      return {
        kind: 'self',
        message: selfReferenceMessage || `A formula cannot reference its own label (${selfReference}).`,
        result: null,
      };
    }

    if (circularPath) {
      return {
        kind: 'circular',
        message: `Circular reference: ${circularPath.map((label) => `@${label}`).join(' -> ')}`,
        result: null,
      };
    }

    if (hasUnresolvedRefs(draft, labels)) {
      return {
        kind: 'unresolved',
        message: 'One or more labels are unavailable. Choose a label from this character.',
        result: null,
      };
    }

    const result = evaluateFormula(draft, labels);
    if (result === null) {
      return {
        kind: 'invalid',
        message: 'The formula could not be evaluated. Check its operators, commas, and parentheses.',
        result: null,
      };
    }

    return { kind: 'valid', message: 'Formula is valid.', result };
  }, [circularPath, draft, labels, selfReferenceMessage, sourceLabelSet]);

  const availableLabels = useMemo(() => {
    if (!character) return [];
    const query = labelSearch.trim().toLowerCase();
    return getAvailableLabels(character).filter((item) => {
      if (excludedLabelSet.has(item.label)) return false;
      if (!query) return true;
      return [item.label, item.widgetLabel, item.sheetName].some((value) => value.toLowerCase().includes(query));
    });
  }, [character, excludedLabelSet, labelSearch]);

  const labelGroups = useMemo(() => {
    const groups = new Map<string, typeof availableLabels>();
    for (const item of availableLabels) {
      const key = `${item.sheetName}\u0000${item.widgetLabel}`;
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }
    return Array.from(groups.entries()).map(([key, items]) => {
      const [sheetName, widgetLabel] = key.split('\u0000');
      return { key, sheetName, widgetLabel, items };
    });
  }, [availableLabels]);

  const filteredReference = useMemo(() => {
    const query = referenceSearch.trim().toLowerCase();
    if (!query) return FORMULA_REFERENCE;
    return FORMULA_REFERENCE.filter((item) => (
      [item.label, item.signature, item.description, item.category]
        .some((value) => value.toLowerCase().includes(query))
    ));
  }, [referenceSearch]);

  const selectedReference = useMemo(
    () => FORMULA_REFERENCE.find((item) => item.id === selectedReferenceId),
    [selectedReferenceId]
  );

  const isValid = status.kind === 'valid';

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onCancel]);

  const insertLabel = (label: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? draft.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const before = draft.slice(0, selectionStart);
    const after = draft.slice(selectionEnd);
    const leadingSpace = /[@a-zA-Z0-9_]$/.test(before) ? ' ' : '';
    const trailingSpace = /^[a-zA-Z0-9_@]/.test(after) ? ' ' : '';
    const insertion = `${leadingSpace}@${label}${trailingSpace}`;
    const nextDraft = `${before}${insertion}${after}`;
    const nextCaret = selectionStart + insertion.length;
    setDraft(nextDraft);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const apply = () => {
    if (!isValid) return;
    onApply(draft.trim());
  };

  const selectReference = (referenceId: string) => {
    setSelectedReferenceId(referenceId);
    requestAnimationFrame(() => referenceDetailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  const renderLabelBrowser = () => (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="formula-labels-title">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h3 id="formula-labels-title" className="text-sm font-bold text-theme-ink">Available labels</h3>
          <p className="text-[11px] text-theme-muted">Click a value to insert it at the cursor.</p>
        </div>
        <span className="text-[11px] tabular-nums text-theme-muted">{availableLabels.length}</span>
      </div>
      <label className="relative mb-2 block">
        <span className="sr-only">Search labels</span>
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-muted" />
        <input
          type="search"
          value={labelSearch}
          onChange={(event) => setLabelSearch(event.target.value)}
          placeholder="Search labels, widgets, or sheets"
          className="h-9 w-full rounded-button border bg-theme-paper pl-8 pr-2 text-xs"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 pr-1">
        {labelGroups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-theme-muted">
            {labelSearch ? 'No labels match this search.' : 'This character has no other numeric labels yet.'}
          </p>
        )}
        <div className="space-y-3">
          {labelGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-1 flex min-w-0 items-baseline gap-1.5 px-1">
                <span className="truncate text-[11px] font-bold text-theme-ink">{group.widgetLabel}</span>
                <span className="truncate text-[10px] text-theme-muted">{group.sheetName}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {group.items.map((item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={() => insertLabel(item.label)}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-left transition-colors hover:border-theme-accent hover:bg-theme-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
                    title={`Insert @${item.label}`}
                  >
                    <span className="min-w-0 truncate font-mono text-xs font-bold text-theme-accent">@{item.label}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-theme-muted">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderReferenceBrowser = () => (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="formula-reference-title">
      <div className="mb-2">
        <h3 id="formula-reference-title" className="text-sm font-bold text-theme-ink">Symbols and commands</h3>
      </div>
      <label className="relative mb-2 block lg:hidden">
        <span className="sr-only">Search formula reference</span>
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-muted" />
        <input
          type="search"
          value={referenceSearch}
          onChange={(event) => setReferenceSearch(event.target.value)}
          placeholder="Search symbols and commands"
          className="h-9 w-full rounded-button border bg-theme-paper pl-8 pr-2 text-xs"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 pr-1">
        <div>
          {FORMULA_REFERENCE_CATEGORIES.map((category: FormulaReferenceCategory) => {
            const items = filteredReference.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="mb-3 last:mb-0">
                <h4 className="mb-1 px-1 text-[10px] font-bold uppercase text-theme-muted">{category}</h4>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selectedReference?.id === item.id}
                      onClick={() => selectReference(item.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-button px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent ${
                        selectedReference?.id === item.id
                          ? 'bg-theme-accent text-theme-paper'
                          : 'text-theme-ink hover:bg-theme-accent/10'
                      }`}
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className={`truncate font-mono text-[10px] ${selectedReference?.id === item.id ? 'text-theme-paper/80' : 'text-theme-muted'}`}>
                        {item.signature}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredReference.length === 0 && <p className="px-2 py-6 text-center text-xs text-theme-muted">No reference items match.</p>}
        </div>
        {selectedReference && (
          <div ref={referenceDetailRef} className="mt-3 border-l-2 border-theme-accent/40 pl-3 pr-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-theme-muted">{selectedReference.category}</span>
                <h4 className="mt-0.5 text-base font-bold text-theme-ink">{selectedReference.label}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReferenceId(null)}
                aria-label="Hide command details"
                className="widget-control h-7 w-7 flex-none"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <code className="mt-2 block overflow-x-auto rounded-button bg-theme-background px-2.5 py-2 font-mono text-xs font-bold text-theme-accent">
              {selectedReference.signature}
            </code>
            <p className="mt-2 text-xs leading-relaxed text-theme-ink">{selectedReference.description}</p>
            <h5 className="mt-3 text-[11px] font-bold uppercase text-theme-muted">Examples</h5>
            <div className="mt-1.5 space-y-2">
              {selectedReference.examples.map((example) => (
                <div key={example.formula} className="border-l border-theme-border pl-2.5">
                  <code className="block whitespace-pre-wrap break-words font-mono text-xs font-bold text-theme-ink">{example.formula}</code>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-theme-muted">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return createPortal(
    <div
      data-formula-editor-dialog="true"
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/55 p-2 sm:p-4 animate-fade-in"
      onClick={onCancel}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="formula-editor-title"
        className="widget-edit-modal__aux-dialog flex h-[min(92vh,52rem)] w-full max-w-6xl flex-col overflow-hidden animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="widget-edit-modal__header flex flex-none items-start justify-between gap-3 border-b border-theme-border">
          <div className="min-w-0">
            <h2 id="formula-editor-title" className="widget-edit-modal__title font-heading text-lg font-bold text-theme-ink">Formula editor</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close formula editor" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5 lg:overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <section className="flex-none" aria-labelledby="formula-expression-title">
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <h3 id="formula-expression-title" className="text-sm font-bold text-theme-ink">Expression</h3>
                <span className="hidden font-mono text-[10px] text-theme-muted sm:block">fx</span>
              </div>
              <textarea
                ref={textareaRef}
                data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-${isValid ? 'formula-input' : 'formula-target'}` : undefined}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    apply();
                  }
                }}
                rows={3}
                spellCheck={false}
                className="min-h-20 max-h-40 w-full resize-y rounded-theme border bg-theme-paper px-3 py-2.5 font-mono text-sm leading-6 text-theme-ink"
                aria-labelledby="formula-expression-title"
                aria-invalid={status.kind !== 'empty' && status.kind !== 'valid'}
                aria-describedby="formula-status"
              />
              <div
                id="formula-status"
                role="status"
                className={`mt-1.5 flex min-h-8 items-center justify-between gap-3 rounded-button border px-2.5 py-1.5 text-xs ${
                  status.kind === 'valid'
                    ? 'border-theme-accent/50 bg-theme-accent/10 text-theme-ink'
                    : status.kind === 'empty'
                      ? 'border-theme-border bg-theme-background text-theme-muted'
                      : 'border-red-400/60 bg-red-500/10 text-red-600'
                }`}
              >
                <span>{status.message}</span>
                {status.kind === 'valid' && (
                  <span className="shrink-0 font-mono text-base font-bold tabular-nums text-theme-accent">= {status.result}</span>
                )}
              </div>
            </section>

            <div className="mb-3 grid grid-cols-2 gap-1 rounded-button bg-theme-background p-1 lg:hidden" role="tablist" aria-label="Formula resources">
              <button
                type="button"
                role="tab"
                aria-selected={mobilePanel === 'labels'}
                onClick={() => setMobilePanel('labels')}
                className={`rounded-button px-3 py-2 text-xs font-bold ${mobilePanel === 'labels' ? 'bg-theme-paper text-theme-ink shadow-sm' : 'text-theme-muted'}`}
              >
                Labels
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobilePanel === 'reference'}
                onClick={() => setMobilePanel('reference')}
                className={`rounded-button px-3 py-2 text-xs font-bold ${mobilePanel === 'reference' ? 'bg-theme-paper text-theme-ink shadow-sm' : 'text-theme-muted'}`}
              >
                Reference
              </button>
            </div>

            <div className={mobilePanel === 'labels' ? 'mt-3 flex min-h-[18rem] flex-1 lg:min-h-0' : 'hidden lg:mt-3 lg:flex lg:min-h-0 lg:flex-1'}>
              {renderLabelBrowser()}
            </div>
          </div>

          <div className={mobilePanel === 'reference' ? 'flex min-h-[18rem] flex-1 lg:min-h-0' : 'hidden lg:flex lg:min-h-0'}>
            {renderReferenceBrowser()}
          </div>
        </div>

        <footer className="widget-edit-modal__footer flex flex-none items-center justify-between gap-2 border-t border-theme-border">
          <div>
            {formula && onClear && (
              <button type="button" onClick={onClear} className="widget-control px-3 py-2 text-xs text-red-600 hover:border-red-500 hover:bg-red-500 hover:text-white">
                Clear formula
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="widget-control px-4 py-2 text-xs font-bold">Cancel</button>
            <button
              data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-${isValid ? 'formula-target' : 'formula-confirm'}` : undefined}
              type="button"
              onClick={apply}
              disabled={!isValid}
              className={`widget-control widget-control--primary px-4 py-2 text-xs font-bold ${highlightApply && isValid ? 'ring-4 ring-blue-500 ring-offset-1' : ''}`}
            >
              Apply formula
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}