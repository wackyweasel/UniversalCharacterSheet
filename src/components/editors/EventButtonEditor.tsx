import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { DEFAULT_EVENT_BUTTON_TEXT } from '../widgets/EventButtonWidget';

interface ColorFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-theme-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
          style={value ? { backgroundColor: value } : undefined}
        >
          <input
            id={id}
            type="color"
            value={value || '#2563eb'}
            onChange={(event) => onChange(event.target.value)}
            className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
          />
        </div>
        {value ? (
          <>
            <span className="flex-1 text-sm text-theme-ink">{value.toUpperCase()}</span>
            <button type="button" onClick={() => onChange(undefined)} className="widget-control px-3 py-2 text-sm">
              Use theme color
            </button>
          </>
        ) : (
          <span className="text-sm text-theme-muted">Theme color</span>
        )}
      </div>
    </div>
  );
}

export function EventButtonEditor({ widget, updateData }: EditorProps) {
  const { buttonText, buttonColor, buttonTextColor } = widget.data;

  return (
    <div className="widget-editor widget-editor--event-button space-y-4">
      <CollapsibleSection title="General">
        <div>
          <label htmlFor={`event-button-text-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">
            Button text
          </label>
          <input
            id={`event-button-text-${widget.id}`}
            className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
            value={buttonText ?? widget.data.label ?? ''}
            // The label names the button in events, the timeline and search, so it follows the text.
            onChange={(event) => updateData({ buttonText: event.target.value, label: event.target.value })}
            placeholder={DEFAULT_EVENT_BUTTON_TEXT}
          />
          <p className="mt-1 text-xs text-theme-muted">
            Choose what happens when it&apos;s pressed in the Events section below.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 className="widget-editor__section-title">Appearance</h3>
        </div>
        <div className="space-y-3">
          <ColorField
            id={`event-button-color-${widget.id}`}
            label="Button color"
            value={buttonColor}
            onChange={(value) => updateData({ buttonColor: value })}
          />
          <ColorField
            id={`event-button-text-color-${widget.id}`}
            label="Text color"
            value={buttonTextColor}
            onChange={(value) => updateData({ buttonTextColor: value })}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
