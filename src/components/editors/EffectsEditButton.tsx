import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ItemEffect, Widget, WidgetData } from '../../types';
import { useStore } from '../../store/useStore';
import { getWidgetEffectSources, type EffectSourceCollection, type WidgetEffectSource } from '../../utils/widgetEffects';
import { ItemEffectsEditor } from '../widgets/ItemEffectsEditor';
import { PencilIcon } from '../icons';

interface Props {
  widget: Widget;
  collection?: EffectSourceCollection;
  index?: number;
  onSave?: (data: WidgetData) => void;
  compact?: boolean;
  iconOnly?: boolean;
  label?: string;
}

export function EffectsEditButton({ widget, collection, index, onSave, compact = false, iconOnly = false, label }: Props) {
  const saveEffects = useStore((state) => state.saveWidgetEffects);
  const [editing, setEditing] = useState<WidgetEffectSource | null>(null);
  const [effects, setEffects] = useState<ItemEffect[]>([]);
  const [valid, setValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const source = getWidgetEffectSources(widget).find((entry) => entry.collection === collection && entry.index === index);
  if (!source) return null;

  const save = () => {
    if (!editing || !valid) return;
    try {
      const data = saveEffects(widget.id, editing.key, effects);
      onSave?.(data);
      setEditing(null);
    } catch (cause) {
      console.error('Could not save effects', cause);
      setError(cause instanceof Error ? cause.message : 'Could not save effects.');
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Edit effects for ${source.name || 'entry'}`}
        title={iconOnly ? 'Edit effects' : source.hint}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setEditing(source);
          setEffects(source.effects);
          setValid(true);
          setError(null);
        }}
        className={iconOnly ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent/15 hover:text-theme-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent' : `widget-control flex-shrink-0 px-2 text-xs ${compact ? 'h-6 min-h-0' : 'h-10'} ${source.effects.length ? 'text-theme-accent' : ''}`}
      >
        {iconOnly ? <PencilIcon className="h-3.5 w-3.5" /> : label ?? `Effects${source.effects.length ? ` (${source.effects.length})` : ''}`}
      </button>
      {editing && createPortal(
        <div
          className="widget-edit-modal__backdrop fixed inset-0 z-[11000] flex items-center justify-center p-3"
          data-touch-camera-ignore="true"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEditing(null);
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-label={`Effects for ${editing.name || 'entry'}`} className="widget-edit-modal__aux-dialog flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden">
            <div className="widget-edit-modal__header border-b border-theme-border">
              <h2 className="widget-edit-modal__title font-heading font-bold text-theme-ink">Effects for {editing.name || 'entry'}</h2>
            </div>
            <div className="min-h-0 space-y-2 overflow-y-auto p-4">
              <ItemEffectsEditor item={{ effects }} onChange={setEffects} onValidityChange={setValid} hint={editing.hint} />
              {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="widget-edit-modal__footer flex justify-end gap-2 border-t border-theme-border">
              <button type="button" autoFocus onClick={() => setEditing(null)} className="widget-control px-3 py-2 text-xs">Cancel</button>
              <button type="button" disabled={!valid} onClick={save} className="widget-control widget-control--primary px-3 py-2 text-xs disabled:opacity-40">Save effects</button>
            </div>
          </div>
        </div>, document.body,
      )}
    </>
  );
}
