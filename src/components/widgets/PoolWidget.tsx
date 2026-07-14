import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, PoolResource } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

const POOL_STYLES = [
  ['dots', '● Dots'],
  ['boxes', '■ Boxes'],
  ['stars', '★ Stars'],
  ['diamonds', '◆ Diamonds'],
  ['crosses', '✖ Crosses'],
  ['checkmarks', '✔ Checkmarks'],
  ['hearts', '❤️ Hearts'],
  ['flames', '🔥 Flames'],
  ['skulls', '💀 Skulls'],
  ['shields', '🛡️ Shields'],
  ['swords', '⚔️ Swords'],
  ['lightning', '⚡ Lightning'],
  ['moons', '🌙 Moons'],
  ['suns', '☀️ Suns'],
  ['coins', '🪙 Coins'],
  ['gems', '💎 Gems'],
] as const;

// Helper to get symbol for a style
const getSymbolForStyle = (filled: boolean, style: string) => {
  switch (style) {
    case 'hearts':
      return filled ? '❤️' : '🖤';
    case 'boxes':
      return filled ? '■' : '□';
    case 'stars':
      return filled ? '★' : '☆';
    case 'diamonds':
      return filled ? '◆' : '◇';
    case 'crosses':
      return filled ? '✖' : '✕';
    case 'checkmarks':
      return filled ? '✔' : '○';
    case 'flames':
      return filled ? '🔥' : '·';
    case 'skulls':
      return filled ? '💀' : '·';
    case 'shields':
      return filled ? '🛡️' : '·';
    case 'swords':
      return filled ? '⚔️' : '·';
    case 'lightning':
      return filled ? '⚡' : '·';
    case 'moons':
      return filled ? '🌙' : '·';
    case 'suns':
      return filled ? '☀️' : '·';
    case 'coins':
      return filled ? '🪙' : '·';
    case 'gems':
      return filled ? '💎' : '·';
    case 'dots':
    default:
      return filled ? '●' : '○';
  }
};

// Helper to get className for a style
const getClassNameForStyle = (filled: boolean, style: string, symbolSize: string) => {
  const base = `${symbolSize} flex items-center justify-center transition-all cursor-pointer hover:scale-125`;
  const emojiStyles = ['hearts', 'flames', 'skulls', 'shields', 'swords', 'lightning', 'moons', 'suns', 'coins', 'gems'];
  if (emojiStyles.includes(style)) {
    return base;
  }
  return `${base} ${filled ? 'text-theme-ink' : 'text-theme-muted'}`;
};

function AddResourceModal({ resourceNumber, onConfirm, onCancel }: { resourceNumber: number; onConfirm: (resource: PoolResource) => void; onCancel: () => void }) {
  const [name, setName] = useState(`Resource ${resourceNumber}`);
  const [amount, setAmount] = useState('5');
  const [style, setStyle] = useState('dots');

  const submit = () => {
    const boundedAmount = Math.max(1, Math.min(100, parseInt(amount, 10) || 1));
    onConfirm({ name: name.trim() || `Resource ${resourceNumber}`, current: boundedAmount, max: boundedAmount, style });
  };

  return (
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onCancel}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="pool-add-resource-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="pool-add-resource-title" className="font-heading text-base font-bold">Add resource</h3>
        <label className="mt-3 block text-sm font-medium" htmlFor="pool-resource-name">Name</label>
        <input
          id="pool-resource-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <label className="mt-3 block text-sm font-medium" htmlFor="pool-resource-amount">Amount</label>
        <input
          id="pool-resource-amount"
          type="number"
          min="1"
          max="100"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-center font-bold text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <label className="mt-3 block text-sm font-medium" htmlFor="pool-resource-style">Style</label>
        <select
          id="pool-resource-style"
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink focus:border-theme-accent focus:outline-none"
        >
          {POOL_STYLES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Add resource</button>
        </div>
      </form>
    </div>
  );
}

function RemoveResourcesModal({ resources, onConfirm, onCancel }: { resources: PoolResource[]; onConfirm: (indexes: Set<number>) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const canRemove = selected.size > 0 && selected.size < resources.length;

  const toggleSelection = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onCancel}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pool-remove-resources-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="pool-remove-resources-title" className="font-heading text-base font-bold">Remove resources</h3>
        <p className="mt-2 text-sm text-theme-muted">Select resources to remove. At least one resource must remain.</p>
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {resources.map((resource, index) => (
            <label key={index} className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper">
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggleSelection(index)}
                className="h-4 w-4 flex-shrink-0 accent-theme-accent"
              />
              <span className="min-w-0 flex-1 truncate">{resource.name || `Resource ${index + 1}`}</span>
              <span className="flex-shrink-0 tabular-nums opacity-70">{resource.current}/{resource.max}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={!canRemove}
            className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remove{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PoolWidget({ widget, height, mode, showFieldControls = true, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots',
    showPoolCount = false,
    poolResources = [],
    inlineLabels = false,
    poolTooltip,
  } = widget.data;
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && interactive && mode !== 'print';
  const resourceInteractive = interactive && mode !== 'print';
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const symbolSize = 'w-6 h-6 text-base';
  const counterClass = 'text-[11px]';
  const gapClass = 'gap-1';

  const legacyFormulas = widget.data.fieldFormulas as Record<string, string> | undefined;
  const resources: PoolResource[] = poolResources.length > 0 ? poolResources : [{
    name: 'Resource 1',
    max: maxPool,
    current: currentPool,
    style: poolStyle,
    maxFormula: legacyFormulas?.maxPool,
    currentFormula: legacyFormulas?.currentPool,
    tooltip: poolTooltip,
  }];

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const toggleResourcePoint = (resourceIndex: number, pointIndex: number) => {
    const resource = resources[resourceIndex];
    if (!resourceInteractive || resource.currentFormula) return;
    const newResources = [...resources];
    if (pointIndex < resource.current) {
      const newVal = pointIndex;
      newResources[resourceIndex] = { ...resource, current: newVal };
      updateWidgetData(widget.id, { poolResources: newResources });
      addTimelineEvent(label || 'Resource Pool', 'POOL', `${resource.name}: used (${resource.current} → ${newVal} / ${resource.max})`, '🟠');
    } else {
      const newVal = pointIndex + 1;
      newResources[resourceIndex] = { ...resource, current: newVal };
      updateWidgetData(widget.id, { poolResources: newResources });
      addTimelineEvent(label || 'Resource Pool', 'POOL', `${resource.name}: restored (${resource.current} → ${newVal} / ${resource.max})`, '🟢');
    }
  };

  const addResource = (resource: PoolResource) => {
    updateWidgetData(widget.id, { poolResources: [...resources, resource] });
    setShowAddDialog(false);
    addTimelineEvent(label || 'Resource Pool', 'POOL', `Added ${resource.name} (${resource.current}/${resource.max})`, '➕');
  };

  const removeResources = (indexes: Set<number>) => {
    const removedNames = resources.filter((_, index) => indexes.has(index)).map((resource) => resource.name);
    const updatedResources = resources.filter((_, index) => !indexes.has(index));
    if (updatedResources.length === 0) return;
    updateWidgetData(widget.id, { poolResources: updatedResources });
    setShowRemoveDialog(false);
    addTimelineEvent(label || 'Resource Pool', 'POOL', `Removed ${removedNames.join(', ')}`, '➖');
  };

  // Calculate available height for scrollable area
  const headerHeight = controlsVisible ? 18 : label ? 16 : 0;
  const availableHeight = height - headerHeight - 8;

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && <div className={`min-w-0 flex-1 truncate font-bold ${labelClass} text-theme-ink font-heading`}>{label}</div>}
          {controlsVisible && (
            <div className="pool-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={resources.length > 1 ? 'Choose resources to remove' : 'At least one resource is required'}>
                <button
                  type="button"
                  onClick={() => setShowRemoveDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={resources.length <= 1}
                  aria-label="Choose resources to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add resource">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add resource"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: `${availableHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) e.stopPropagation();
        }}
      >
          {resources.map((resource: PoolResource, idx: number) => (
            <div key={idx} className={`flex flex-col ${gapClass}`}>
              {resource.name && !inlineLabels && (
                <div className={`font-medium ${counterClass} text-theme-ink font-body`}>
                  {mode === 'play' && resource.tooltip ? (
                    <Tooltip content={resource.tooltip}><span>{resource.name}</span></Tooltip>
                  ) : resource.name}
                </div>
              )}
              <div className={`flex ${inlineLabels ? 'justify-between items-center' : 'flex-wrap gap-0.5 content-start items-center'}`}>
                {resource.name && inlineLabels && (
                  <span className={`font-medium ${counterClass} text-theme-ink font-body`}>
                    {mode === 'play' && resource.tooltip ? (
                      <Tooltip content={resource.tooltip}><span>{resource.name}</span></Tooltip>
                    ) : resource.name}
                  </span>
                )}
                <div className={`flex ${inlineLabels ? 'gap-0.5' : 'flex-wrap gap-0.5'}`}>
                {Array.from({ length: resource.max }).map((_, pointIdx) => (
                  <Tooltip key={pointIdx} content={resource.currentFormula ? 'Value set by formula' : (pointIdx < resource.current ? 'Click to use' : 'Click to restore')}>
                    <button
                      onClick={() => toggleResourcePoint(idx, pointIdx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={!resourceInteractive || !!resource.currentFormula}
                      aria-label={`${resource.name || 'Resource'} ${pointIdx + 1}: ${pointIdx < resource.current ? 'filled' : 'empty'}`}
                      aria-pressed={pointIdx < resource.current}
                      className={`${getClassNameForStyle(pointIdx < resource.current, resource.style, symbolSize)} ${resource.currentFormula ? '!cursor-default hover:!scale-100' : ''}`}
                    >
                      {getSymbolForStyle(pointIdx < resource.current, resource.style)}
                    </button>
                  </Tooltip>
                ))}
                </div>
              </div>
              {showPoolCount && (
                <div className={`${counterClass} text-theme-muted font-body tabular-nums`}>
                  {resource.currentFormula && isFormulaBroken(resource.currentFormula, labels) && (
                    <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${resource.currentFormula}`}>⚠</span>
                  )}
                  {resource.current} / {resource.max}
                  {resource.maxFormula && isFormulaBroken(resource.maxFormula, labels) && (
                    <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${resource.maxFormula}`}>⚠</span>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {showAddDialog && createPortal(
        <AddResourceModal resourceNumber={resources.length + 1} onConfirm={addResource} onCancel={() => setShowAddDialog(false)} />,
        document.body
      )}
      {showRemoveDialog && createPortal(
        <RemoveResourcesModal resources={resources} onConfirm={removeResources} onCancel={() => setShowRemoveDialog(false)} />,
        document.body
      )}
    </div>
  );
}






