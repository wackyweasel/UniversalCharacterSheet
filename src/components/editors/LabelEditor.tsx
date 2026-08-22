import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
] as const;

export function LabelEditor({ widget, updateData }: EditorProps) {
  const { label, labelAlignment = 'left', labelTextColor } = widget.data;

  return (
    <div className="widget-editor widget-editor--label space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-theme-ink">Label</label>
        <div className="relative">
          <input
            className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 pr-8 text-theme-ink focus:border-theme-accent focus:outline-none"
            value={label || ''}
            onChange={(event) => updateData({ label: event.target.value })}
            placeholder="Label"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted transition-colors hover:text-theme-ink"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <section className="widget-editor__section" aria-labelledby="label-style-title">
        <div className="widget-editor__section-heading">
          <h3 id="label-style-title" className="widget-editor__section-title">Style</h3>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Alignment</span>
          <div className="inline-flex overflow-hidden rounded-button border border-theme-border">
            {ALIGNMENT_OPTIONS.map(({ value, label: optionLabel, Icon }) => (
              <Tooltip key={value} content={optionLabel}>
                <button
                  type="button"
                  aria-label={optionLabel}
                  aria-pressed={labelAlignment === value}
                  onClick={() => updateData({ labelAlignment: value })}
                  className={`flex h-9 w-10 items-center justify-center transition-colors ${
                    labelAlignment === value
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={`label-text-color-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">
            Text Color
          </label>
          <div className="flex items-center gap-2">
            <div
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
              style={labelTextColor ? { backgroundColor: labelTextColor } : undefined}
            >
              <input
                id={`label-text-color-${widget.id}`}
                type="color"
                value={labelTextColor || '#2563eb'}
                onChange={(event) => updateData({ labelTextColor: event.target.value })}
                className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
              />
            </div>
            {labelTextColor ? (
              <>
                <span className="flex-1 text-sm text-theme-ink">{labelTextColor.toUpperCase()}</span>
                <button type="button" onClick={() => updateData({ labelTextColor: undefined })} className="widget-control px-3 py-2 text-sm">
                  Use theme color
                </button>
              </>
            ) : (
              <span className="text-sm text-theme-muted">Theme color</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}