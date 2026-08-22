import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';

export function TextEditor({ widget, updateData }: EditorProps) {
  const { label } = widget.data;

  return (
    <div className="widget-editor widget-editor--text space-y-4">
      <section className="widget-editor__section" aria-labelledby="text-label-title">
        <div className="widget-editor__section-heading">
          <h3 id="text-label-title" className="widget-editor__section-title">Content</h3>
        </div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Title"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
      </section>
      <p className="widget-editor__hint text-xs text-theme-muted">
        Use the resize handle on the widget in edit mode to adjust the size.
      </p>
    </div>
  );
}

