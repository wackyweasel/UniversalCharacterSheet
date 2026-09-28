import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { Widget } from '../../types';
import { Tooltip } from '../Tooltip';

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
] as const;

interface Props {
  widget: Widget;
  updateData: (data: Partial<Widget['data']>) => void;
}

export function ImageTitleControls({ widget, updateData }: Props) {
  const {
    hideImageTitle = false,
    imageTitleAlignment = 'left',
    imageTitlePosition = 'above',
  } = widget.data;

  return (
    <>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={hideImageTitle}
          onChange={(event) => updateData({ hideImageTitle: event.target.checked })}
          className="h-4 w-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Hide name</span>
      </label>
      {!hideImageTitle && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="image-editor__control-group">
          <span className="image-editor__control-label">Alignment</span>
          <div className="flex overflow-hidden rounded-button border border-theme-border">
            {ALIGNMENT_OPTIONS.map(({ value, label, Icon }) => (
              <Tooltip key={value} content={label}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={imageTitleAlignment === value}
                  onClick={() => updateData({ imageTitleAlignment: value })}
                  className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                    imageTitleAlignment === value
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
        <div className="image-editor__control-group">
          <span className="image-editor__control-label">Position</span>
          <div className="flex overflow-hidden rounded-button border border-theme-border">
            <Tooltip content="Name above image">
              <button
                type="button"
                aria-label="Name above image"
                aria-pressed={imageTitlePosition === 'above'}
                onClick={() => updateData({ imageTitlePosition: 'above' })}
                className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                  imageTitlePosition === 'above'
                    ? 'bg-theme-accent text-theme-paper'
                    : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                <ArrowUpToLine className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip content="Name below image">
              <button
                type="button"
                aria-label="Name below image"
                aria-pressed={imageTitlePosition === 'below'}
                onClick={() => updateData({ imageTitlePosition: 'below' })}
                className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                  imageTitlePosition === 'below'
                    ? 'bg-theme-accent text-theme-paper'
                    : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>}
    </>
  );
}
