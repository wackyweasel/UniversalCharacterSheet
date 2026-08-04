import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DiceExpressionRollResult } from '../../utils/diceExpression';
import { formatDiceRollDetail, formatDiceStep, parseDiceStep } from '../../utils/diceExpression';
import type { MixedField, MixedFieldType, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import {
  clampMixedFieldValue,
  createMixedField,
  DEFAULT_MIXED_FIELD_DICE_CHAIN,
  MIXED_FIELD_TYPE_OPTIONS,
} from '../../utils/mixedFields';
import { Tooltip } from '../Tooltip';
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';
import { WidgetEmptyState } from './WidgetPrimitives';
import { rollDiceStep } from './StepDiceWidget';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

const RESOURCE_SYMBOLS: Record<string, [string, string]> = {
  boxes: ['■', '□'],
  stars: ['★', '☆'],
  diamonds: ['◆', '◇'],
  hearts: ['♥', '♡'],
  dots: ['●', '○'],
};

const HOLD_DELAY_MS = 300;

interface MixedProgressValueModalProps {
  field: Extract<MixedField, { type: 'progress' }>;
  currentEditable: boolean;
  maxEditable: boolean;
  onConfirm: (current: number, max: number) => void;
  onCancel: () => void;
}

function MixedProgressValueModal({ field, currentEditable, maxEditable, onConfirm, onCancel }: MixedProgressValueModalProps) {
  const [currentDraft, setCurrentDraft] = useState(String(field.current));
  const [maxDraft, setMaxDraft] = useState(String(field.max));

  const submit = () => {
    const max = maxEditable && Number.isFinite(Number(maxDraft)) ? Math.max(1, Number(maxDraft)) : field.max;
    const current = currentEditable && Number.isFinite(Number(currentDraft)) ? Number(currentDraft) : field.current;
    onConfirm(Math.max(0, Math.min(max, current)), max);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in" onClick={onCancel} onMouseDown={(event) => event.stopPropagation()} />
      <form role="dialog" aria-modal="true" aria-label={`Set ${field.name} values`} className="fixed left-1/2 top-1/2 z-[10000] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme animate-fade-in" onSubmit={(event) => { event.preventDefault(); submit(); }} onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
        <h3 className="font-heading text-base font-bold">{field.name || 'Progress'} values</h3>
        <label className="mt-3 block text-sm font-medium">Current value<input autoFocus={currentEditable} type="number" min="0" max={maxDraft || field.max} value={currentDraft} disabled={!currentEditable} onChange={(event) => setCurrentDraft(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></label>
        <label className="mt-3 block text-sm font-medium">Maximum value<input autoFocus={!currentEditable && maxEditable} type="number" min="1" value={maxDraft} disabled={!maxEditable} onChange={(event) => setMaxDraft(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center text-lg font-bold text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></label>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button><button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Save</button></div>
      </form>
    </>
  );
}

function MixedProgressControl({
  field,
  canInteract,
  isPrintMode,
  labels,
  onUpdate,
  onAnnounce,
}: {
  field: Extract<MixedField, { type: 'progress' }>;
  canInteract: boolean;
  isPrintMode: boolean;
  labels: Record<string, number>;
  onUpdate: (field: MixedField) => void;
  onAnnounce: (detail: string) => void;
}) {
  const [showValueModal, setShowValueModal] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const scrubStartRef = useRef(field.current);
  const pointerStartXRef = useRef(0);
  const pointerLatestXRef = useRef(0);
  const hasCurrentFormula = !!field.currentFormula;
  const hasMaxFormula = !!field.maxFormula;
  const valuesEditable = canInteract && (!hasCurrentFormula || !hasMaxFormula);
  const safeMax = Math.max(1, field.max);
  const displayedValue = scrubValue ?? field.current;
  const percentage = Math.round((Math.max(0, Math.min(safeMax, displayedValue)) / safeMax) * 100);
  const currentBroken = hasCurrentFormula && isFormulaBroken(field.currentFormula!, labels);
  const maxBroken = hasMaxFormula && isFormulaBroken(field.maxFormula!, labels);

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, []);

  const clearHoldTimer = () => {
    if (holdTimerRef.current === null) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const getValueFromPointer = (clientX: number, element: HTMLDivElement) => {
    const bounds = element.getBoundingClientRect();
    const delta = bounds.width > 0 ? ((clientX - pointerStartXRef.current) / bounds.width) * safeMax : 0;
    return Math.round(Math.max(0, Math.min(safeMax, scrubStartRef.current + delta)));
  };

  const updateCurrent = (current: number) => {
    if (hasCurrentFormula) return;
    const nextCurrent = Math.max(0, Math.min(safeMax, current));
    if (nextCurrent === field.current) return;
    onUpdate({ ...field, current: nextCurrent });
    onAnnounce(`${field.current}/${safeMax} → ${nextCurrent}/${safeMax}`);
  };

  const setValues = (current: number, max: number) => {
    const nextMax = hasMaxFormula ? field.max : Math.max(1, max);
    const nextCurrent = hasCurrentFormula ? field.current : Math.max(0, Math.min(nextMax, current));
    if (nextCurrent !== field.current || nextMax !== field.max) {
      onUpdate({ ...field, ...(hasCurrentFormula ? {} : { current: nextCurrent }), ...(hasMaxFormula ? {} : { max: nextMax }) });
      onAnnounce(`${field.current}/${field.max} → ${nextCurrent}/${nextMax}`);
    }
    setShowValueModal(false);
  };

  const readout = field.showValues !== false && field.showPercentage
    ? `${displayedValue}/${safeMax} (${percentage}%)`
    : field.showValues !== false
      ? `${displayedValue}/${safeMax}`
      : field.showPercentage
        ? `${percentage}%`
        : '';

  return (
    <>
      <Tooltip content={hasCurrentFormula && hasMaxFormula ? 'Values set by formula' : hasCurrentFormula ? 'Click to edit maximum' : 'Click to edit; hold and drag to change progress'}>
        <div
          role={valuesEditable && !hasCurrentFormula ? 'slider' : 'progressbar'}
          aria-label={field.name || 'Progress'}
          aria-valuemin={0}
          aria-valuemax={safeMax}
          aria-valuenow={displayedValue}
          aria-valuetext={`${displayedValue} of ${safeMax}`}
          tabIndex={valuesEditable ? 0 : undefined}
          data-touch-camera-ignore={valuesEditable ? 'true' : undefined}
          className={`progress-bar__track h-6 min-w-[80px] flex-1 ${!valuesEditable ? 'progress-bar__track--disabled' : ''}`}
          onPointerDown={(event) => {
            if (!valuesEditable) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            scrubStartRef.current = field.current;
            pointerStartXRef.current = event.clientX;
            pointerLatestXRef.current = event.clientX;
            if (!hasCurrentFormula) {
              const element = event.currentTarget;
              holdTimerRef.current = window.setTimeout(() => {
                holdTimerRef.current = null;
                scrubbingRef.current = true;
                setScrubValue(getValueFromPointer(pointerLatestXRef.current, element));
              }, HOLD_DELAY_MS);
            }
          }}
          onPointerMove={(event) => {
            pointerLatestXRef.current = event.clientX;
            if (!scrubbingRef.current) return;
            event.preventDefault();
            setScrubValue(getValueFromPointer(event.clientX, event.currentTarget));
          }}
          onPointerUp={(event) => {
            if (!valuesEditable) return;
            event.preventDefault();
            event.stopPropagation();
            clearHoldTimer();
            const wasScrubbing = scrubbingRef.current;
            const nextValue = wasScrubbing ? getValueFromPointer(event.clientX, event.currentTarget) : field.current;
            scrubbingRef.current = false;
            setScrubValue(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (wasScrubbing) updateCurrent(nextValue);
            else setShowValueModal(true);
          }}
          onPointerCancel={(event) => {
            clearHoldTimer();
            scrubbingRef.current = false;
            setScrubValue(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (!valuesEditable) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setShowValueModal(true);
            } else if (!hasCurrentFormula && (event.key === 'ArrowLeft' || event.key === 'ArrowDown')) {
              event.preventDefault();
              updateCurrent(field.current - 1);
            } else if (!hasCurrentFormula && (event.key === 'ArrowRight' || event.key === 'ArrowUp')) {
              event.preventDefault();
              updateCurrent(field.current + 1);
            }
          }}
        >
          <div className="progress-bar__fill-clip"><div className="progress-bar__fill" style={{ width: isPrintMode ? '0%' : `${percentage}%`, ...(field.fillColor ? { backgroundColor: field.fillColor } : {}) }} /></div>
          {readout && <div className={`progress-bar__readout ${isPrintMode ? 'bar-readout--print' : ''}`}>{currentBroken && <span className="mr-0.5 text-[9px] text-red-500" title={`Broken formula: ${field.currentFormula}`}>⚠</span>}<strong>{readout}</strong>{maxBroken && <span className="ml-0.5 text-[9px] text-red-500" title={`Broken formula: ${field.maxFormula}`}>⚠</span>}</div>}
        </div>
      </Tooltip>
      {showValueModal && createPortal(<MixedProgressValueModal field={field} currentEditable={!hasCurrentFormula} maxEditable={!hasMaxFormula} onConfirm={setValues} onCancel={() => setShowValueModal(false)} />, document.body)}
    </>
  );
}

export default function MixedFieldsWidget({
  widget,
  mode,
  height,
  showFieldControls = true,
  interactive = true,
}: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const { label, mixedFields = [], labelWidth = 33 } = widget.data;
  const isPrintMode = mode === 'print';
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && interactive && !isPrintMode;
  const canInteract = interactive && !isPrintMode;
  const [dialog, setDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<MixedFieldType>('text');
  const [addMultiple, setAddMultiple] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [rollResults, setRollResults] = useState<Record<number, DiceExpressionRollResult>>({});
  const previousTextValues = useRef<Record<number, string>>({});
  const labels = useMemo(() => {
    const character = characters.find((item) => item.id === activeCharacterId);
    return character ? collectLabels(character) : {};
  }, [activeCharacterId, characters]);

  const updateField = (index: number, field: MixedField) => {
    const updated = [...mixedFields];
    updated[index] = field;
    updateWidgetData(widget.id, { mixedFields: updated });
  };

  const announceChange = (field: MixedField, detail: string) => {
    addTimelineEvent(label || 'Mixed fields', 'MIXED_FIELDS', `${field.name}: ${detail}`, '✎');
  };

  const adjustNumber = (index: number, field: Extract<MixedField, { type: 'number' }>, delta: number) => {
    if (field.valueFormula) return;
    const nextValue = clampMixedFieldValue(
      field.value + delta,
      field.minValue ?? Number.NEGATIVE_INFINITY,
      field.maxValue ?? Number.POSITIVE_INFINITY,
    );
    if (nextValue === field.value) return;
    updateField(index, { ...field, value: nextValue });
    announceChange(field, `${field.value} → ${nextValue}`);
  };

  const rollStepDie = async (index: number, field: Extract<MixedField, { type: 'step-dice' }>) => {
    const chain = field.diceChain?.length ? field.diceChain : DEFAULT_MIXED_FIELD_DICE_CHAIN;
    const terms = parseDiceStep(chain[field.currentStep]);
    if (!terms) return;
    setRollingIndex(index);
    try {
      const result = await rollDiceStep(terms);
      setRollResults((current) => ({ ...current, [index]: result }));
      announceChange(field, formatDiceRollDetail(result));
    } finally {
      setRollingIndex(null);
    }
  };

  const addField = () => {
    const name = fieldName.trim();
    if (!name) return;
    updateWidgetData(widget.id, { mixedFields: [...mixedFields, createMixedField(fieldType, name)] });
    setFieldName('');
    if (!addMultiple) setDialog(null);
  };

  const removeSelected = () => {
    if (selectedFields.size === 0) return;
    updateWidgetData(widget.id, { mixedFields: mixedFields.filter((_, index) => !selectedFields.has(index)) });
    setSelectedFields(new Set());
    setDialog(null);
  };

  const closeDialog = () => {
    setDialog(null);
    setFieldName('');
    setFieldType('text');
    setAddMultiple(false);
    setSelectedFields(new Set());
  };

  const availableHeight = Math.max(30, height - ((label || controlsVisible) ? 28 : 0));

  const renderFieldControl = (field: MixedField, index: number) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={field.value}
            onFocus={() => { previousTextValues.current[index] = field.value; }}
            onChange={(event) => updateField(index, { ...field, value: event.target.value })}
            onBlur={() => {
              const previous = previousTextValues.current[index];
              if (previous !== undefined && previous !== field.value) announceChange(field, 'text changed');
              delete previousTextValues.current[index];
            }}
            onMouseDown={(event) => event.stopPropagation()}
            readOnly={!canInteract}
            placeholder={isPrintMode ? '' : '...'}
            className="min-w-0 flex-1 border-b border-theme-border bg-transparent px-1 py-0.5 text-xs text-theme-ink outline-none focus:border-theme-accent"
          />
        );
      case 'menu':
        return (
          <select
            value={field.value}
            onChange={(event) => {
              const nextValue = event.target.value;
              updateField(index, { ...field, value: nextValue });
              announceChange(field, nextValue || 'cleared');
            }}
            onMouseDown={(event) => event.stopPropagation()}
            disabled={!canInteract}
            className="h-7 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-1 text-xs text-theme-ink outline-none focus:border-theme-accent"
          >
            <option value="">Select...</option>
            {field.options.map((option, optionIndex) => <option key={`${option}-${optionIndex}`} value={option}>{option}</option>)}
          </select>
        );
      case 'number': {
        const hasValueFormula = !!field.valueFormula;
        const atMinimum = field.minValue !== undefined && field.value <= field.minValue;
        const atMaximum = field.maxValue !== undefined && field.value >= field.maxValue;
        return (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
            {!isPrintMode && <button type="button" aria-label={`Decrease ${field.name}`} onClick={() => adjustNumber(index, field, -1)} disabled={!canInteract || hasValueFormula || atMinimum} className="widget-control h-6 w-6 min-h-0 text-xs">−</button>}
            <input
              type="number"
              value={field.value}
              min={field.minValue}
              max={field.maxValue}
              onChange={(event) => {
                if (hasValueFormula) return;
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) updateField(index, { ...field, value: clampMixedFieldValue(parsed, field.minValue ?? Number.NEGATIVE_INFINITY, field.maxValue ?? Number.POSITIVE_INFINITY) });
              }}
              onBlur={() => { if (!hasValueFormula) announceChange(field, `set to ${field.value}`); }}
              onMouseDown={(event) => event.stopPropagation()}
              readOnly={!canInteract || hasValueFormula}
              className={`h-6 w-16 rounded-button border border-theme-border px-1 text-center text-xs font-bold text-theme-ink outline-none focus:border-theme-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${hasValueFormula ? 'cursor-default bg-theme-accent/10' : 'bg-theme-paper'}`}
            />
            {!isPrintMode && <button type="button" aria-label={`Increase ${field.name}`} onClick={() => adjustNumber(index, field, 1)} disabled={!canInteract || hasValueFormula || atMaximum} className="widget-control h-6 w-6 min-h-0 text-xs">+</button>}
          </div>
        );
      }
      case 'progress':
        return <MixedProgressControl field={field} canInteract={canInteract} isPrintMode={isPrintMode} labels={labels} onUpdate={(updated) => updateField(index, updated)} onAnnounce={(detail) => announceChange(field, detail)} />;
      case 'resource': {
        const [filledSymbol, emptySymbol] = RESOURCE_SYMBOLS[field.style] || RESOURCE_SYMBOLS.dots;
        const max = Math.max(1, Math.min(100, Math.round(field.max)));
        const current = Math.max(0, Math.min(max, field.current));
        const hasCurrentFormula = !!field.currentFormula;
        return (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5">
            {Array.from({ length: max }, (_, pointIndex) => (
              <button
                key={pointIndex}
                type="button"
                disabled={!canInteract || hasCurrentFormula}
                onClick={() => {
                  const nextValue = pointIndex < current ? pointIndex : pointIndex + 1;
                  updateField(index, { ...field, current: nextValue });
                  announceChange(field, `${current}/${max} → ${nextValue}/${max}`);
                }}
                className="flex h-5 w-5 items-center justify-center text-sm text-theme-ink disabled:cursor-default"
                aria-label={`Set ${field.name} to ${pointIndex < current ? pointIndex : pointIndex + 1}`}
              >
                {pointIndex < current ? filledSymbol : emptySymbol}
              </button>
            ))}
            {field.showCount && <span className="ml-0.5 text-[10px] text-theme-muted">{current}/{max}</span>}
          </div>
        );
      }
      case 'step-dice': {
        const chain = field.diceChain?.length ? field.diceChain : DEFAULT_MIXED_FIELD_DICE_CHAIN;
        const currentStep = clampMixedFieldValue(field.currentStep, 0, chain.length - 1);
        const result = rollResults[index];
        return (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            {!isPrintMode && <button type="button" aria-label={`Step ${field.name} down`} onClick={() => updateField(index, { ...field, currentStep: Math.max(0, currentStep - 1) })} disabled={!canInteract || currentStep === 0} className="widget-control h-6 w-6 min-h-0 text-[9px]">▼</button>}
            <button type="button" aria-label={`Roll ${field.name}: ${formatDiceStep(chain[currentStep])}`} onClick={() => rollStepDie(index, field)} disabled={!canInteract || rollingIndex === index} className="widget-control h-6 min-w-[52px] min-h-0 px-1 text-xs font-bold">
              {formatDiceStep(chain[currentStep])}
            </button>
            {!isPrintMode && <button type="button" aria-label={`Step ${field.name} up`} onClick={() => updateField(index, { ...field, currentStep: Math.min(chain.length - 1, currentStep + 1) })} disabled={!canInteract || currentStep === chain.length - 1} className="widget-control h-6 w-6 min-h-0 text-[9px]">▲</button>}
            {result && !isPrintMode && <span className="min-w-5 text-center text-xs font-bold text-theme-accent">{result.total}</span>}
          </div>
        );
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-1">
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && <div className="widget-structure-title min-w-0 flex-1 truncate">{label}</div>}
          {controlsVisible && (
            <div className="widget-structure-controls ml-auto flex items-center gap-1">
              <Tooltip content={mixedFields.length ? 'Choose fields to remove' : 'No fields to remove'}>
                <button type="button" aria-label="Choose fields to remove" disabled={!mixedFields.length} onClick={() => { setSelectedFields(new Set()); setDialog('remove'); }} onMouseDown={(event) => event.stopPropagation()} className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold">−</button>
              </Tooltip>
              <Tooltip content="Add field">
                <button type="button" aria-label="Add field" onClick={() => { setFieldName(''); setFieldType('text'); setDialog('add'); }} onMouseDown={(event) => event.stopPropagation()} className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold">+</button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1" style={{ maxHeight: `${availableHeight}px` }} onWheel={(event) => { if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation(); }}>
        {mixedFields.map((field, index) => (
          <div key={index} className="flex min-h-7 items-center gap-2">
            <span className="flex-shrink-0 truncate text-xs text-theme-ink" style={{ width: `${labelWidth}%` }}>
              {mode === 'play' && field.tooltip ? <Tooltip content={field.tooltip}><span>{field.name}</span></Tooltip> : field.name}
            </span>
            {renderFieldControl(field, index)}
          </div>
        ))}
        {mixedFields.length === 0 && <WidgetEmptyState title="No fields yet" hint={controlsVisible ? 'Use + to add a field.' : undefined} compact />}
      </div>

      {dialog && createPortal(
        <div data-touch-camera-ignore="true" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" onClick={closeDialog} onMouseDown={(event) => event.stopPropagation()}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-heading text-base font-bold">{dialog === 'add' ? 'Add mixed field' : 'Remove fields'}</h3>
            {dialog === 'add' ? (
              <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); addField(); }}>
                <div><label className="block text-sm font-medium">Field name</label><input autoFocus value={fieldName} onChange={(event) => setFieldName(event.target.value)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-sm" /></div>
                <div><label className="block text-sm font-medium">Field type</label><select value={fieldType} onChange={(event) => setFieldType(event.target.value as MixedFieldType)} className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-sm">{MIXED_FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} />
                <div className="flex justify-end gap-2"><button type="button" onClick={closeDialog} className="widget-control px-3 py-1.5 text-sm">Cancel</button><button type="submit" disabled={!fieldName.trim()} className="widget-control widget-control--primary px-3 py-1.5 text-sm">Add field</button></div>
              </form>
            ) : (
              <div className="mt-3">
                <SelectionActions onCheckAll={() => setSelectedFields(new Set(mixedFields.map((_, index) => index)))} onUncheckAll={() => setSelectedFields(new Set())} />
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">{mixedFields.map((field, index) => <label key={index} className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm"><input type="checkbox" checked={selectedFields.has(index)} onChange={() => setSelectedFields((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} className="h-4 w-4 accent-theme-accent" /><span className="min-w-0 flex-1 truncate">{field.name}</span><span className="text-xs text-theme-muted">{field.type}</span></label>)}</div>
                <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={closeDialog} className="widget-control px-3 py-1.5 text-sm">Cancel</button><button type="button" onClick={removeSelected} disabled={!selectedFields.size} className="rounded-button bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Remove{selectedFields.size ? ` (${selectedFields.size})` : ''}</button></div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}