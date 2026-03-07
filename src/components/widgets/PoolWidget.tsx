import { useMemo } from 'react';
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
}

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

export default function PoolWidget({ widget, height, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots',
    showPoolCount = true,
    poolResources = [],
    inlineLabels = false,
    poolTooltip,
  } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const symbolSize = 'w-5 h-5 text-sm';
  const counterClass = 'text-[10px]';
  const gapClass = 'gap-1';

  // If poolResources has items, use multi-resource mode
  const hasMultipleResources = poolResources.length > 0;

  const hasCurrentPoolFormula = !!(widget.data.fieldFormulas as Record<string, string> | undefined)?.currentPool;
  const hasMaxPoolFormula = !!(widget.data.fieldFormulas as Record<string, string> | undefined)?.maxPool;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  // Toggle point for legacy single pool
  const togglePoint = (index: number) => {
    if (hasCurrentPoolFormula) return;
    let newVal: number;
    if (index < currentPool) {
      newVal = index;
      updateWidgetData(widget.id, { currentPool: newVal });
      addTimelineEvent(label || 'Resource Pool', 'POOL', `Used (${currentPool} → ${newVal} / ${maxPool})`, '🟠');
    } else {
      newVal = index + 1;
      updateWidgetData(widget.id, { currentPool: newVal });
      addTimelineEvent(label || 'Resource Pool', 'POOL', `Restored (${currentPool} → ${newVal} / ${maxPool})`, '🟢');
    }
  };

  // Toggle point for a specific resource
  const toggleResourcePoint = (resourceIndex: number, pointIndex: number) => {
    const resource = poolResources[resourceIndex];
    if (resource.currentFormula) return;
    const newResources = [...poolResources];
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

  // Calculate available height for scrollable area
  const headerHeight = label ? 20 : 0;
  const availableHeight = height - headerHeight - 8;

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {!hasMultipleResources && mode === 'play' && poolTooltip ? (
            <Tooltip content={poolTooltip}><span>{label}</span></Tooltip>
          ) : label}
        </div>
      )}

      {hasMultipleResources ? (
        // Multiple resources mode
        <div 
          className={`flex flex-col gap-2 flex-1 overflow-y-auto pr-1`}
          style={{ maxHeight: `${availableHeight}px` }}
          onWheel={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight > el.clientHeight) {
              e.stopPropagation();
            }
          }}
        >
          {poolResources.map((resource: PoolResource, idx: number) => (
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
                      className={`${getClassNameForStyle(pointIdx < resource.current, resource.style, symbolSize)} ${resource.currentFormula ? '!cursor-default hover:!scale-100' : ''}`}
                    >
                      {getSymbolForStyle(pointIdx < resource.current, resource.style)}
                    </button>
                  </Tooltip>
                ))}
                </div>
              </div>
              {showPoolCount && (
                <div className={`${counterClass} text-theme-muted font-body`}>
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
      ) : (
        // Legacy single pool mode
        <>
          <div 
            className={`flex flex-wrap gap-0.5 flex-1 content-start overflow-y-auto`} 
            onWheel={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight > el.clientHeight) {
                e.stopPropagation();
              }
            }}
          >
            {Array.from({ length: maxPool }).map((_, idx) => (
              <Tooltip key={idx} content={hasCurrentPoolFormula ? 'Value set by formula' : (idx < currentPool ? 'Click to use' : 'Click to restore')}>
                <button
                  onClick={() => togglePoint(idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`${getClassNameForStyle(idx < currentPool, poolStyle, symbolSize)} ${hasCurrentPoolFormula ? '!cursor-default hover:!scale-100' : ''}`}
                >
                  {getSymbolForStyle(idx < currentPool, poolStyle)}
                </button>
              </Tooltip>
            ))}
          </div>

          {showPoolCount && (
            <div className={`${counterClass} text-center text-theme-muted font-body flex-shrink-0`}>
              {hasCurrentPoolFormula && isFormulaBroken((widget.data.fieldFormulas as Record<string, string>).currentPool, labels) && (
                <span className="text-red-500 text-[9px] mr-0.5" title={`Broken formula: ${(widget.data.fieldFormulas as Record<string, string>).currentPool}`}>⚠</span>
              )}
              {currentPool} / {maxPool}
              {hasMaxPoolFormula && isFormulaBroken((widget.data.fieldFormulas as Record<string, string>).maxPool, labels) && (
                <span className="text-red-500 text-[9px] ml-0.5" title={`Broken formula: ${(widget.data.fieldFormulas as Record<string, string>).maxPool}`}>⚠</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}






