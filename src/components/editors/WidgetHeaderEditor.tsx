import { Widget, WidgetType } from '../../types';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  widget: Widget;
  updateData: (data: Partial<Widget['data']>) => void;
}

const LABEL_WIDGET_TYPES = new Set<WidgetType>([
  'CHECKBOX',
  'DECK_OF_CARDS',
  'DECK',
  'DICE_ROLLER',
  'DICE_TRAY',
  'FORM',
  'MIXED_FIELDS',
  'GRID_MAP',
  'HEALTH_BAR',
  'INITIATIVE_TRACKER',
  'INVENTORY',
  'LIST',
  'MAP_SKETCHER',
  'NUMBER',
  'NUMBER_DISPLAY',
  'POOL',
  'PROGRESS_BAR',
  'PROGRESS_CLOCK',
  'ROLL_TABLE',
  'SPELL_SLOT',
  'STEP_DICE',
  'TABLE',
  'TEXT',
  'TIME_TRACKER',
  'TIMER',
  'TOGGLE',
  'TOGGLE_GROUP',
  'IMAGE',
]);

const HEADER_CONTROL_WIDGET_TYPES = new Set<WidgetType>([
  'CHECKBOX',
  'FORM',
  'MIXED_FIELDS',
  'LIST',
  'NUMBER',
  'NUMBER_DISPLAY',
  'POOL',
  'PROGRESS_CLOCK',
  'STEP_DICE',
  'SPELL_SLOT',
  'TOGGLE_GROUP',
  'INITIATIVE_TRACKER',
  'INVENTORY',
]);

const HEADER_HIDING_SUPPORTED_TYPES = new Set<WidgetType>([
  'LABEL',
  'IMAGE',
]);

export function WidgetHeaderEditor({ widget, updateData }: Props) {
  const { label, hideWidgetHeader = false, hideWidgetEditButton = false } = widget.data;
  const canHideHeader = !HEADER_HIDING_SUPPORTED_TYPES.has(widget.type);
  const headerHidden = canHideHeader && hideWidgetHeader;
  const hasLabel = LABEL_WIDGET_TYPES.has(widget.type) || widget.type === 'LABEL';
  const showLabel = hasLabel && !(widget.type === 'IMAGE' && widget.data.hideImageTitle);
  const hasHeaderControls = HEADER_CONTROL_WIDGET_TYPES.has(widget.type);
  const isSpellSlot = widget.type === 'SPELL_SLOT';
  const isTable = widget.type === 'TABLE';
  const isCardDeck = widget.type === 'DECK_OF_CARDS';

  return (
    <CollapsibleSection title="Header">
      <div className="space-y-3">
        {canHideHeader && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
            <input
              type="checkbox"
              checked={hideWidgetHeader}
              onChange={(event) => updateData({ hideWidgetHeader: event.target.checked })}
              className="h-4 w-4 accent-theme-accent"
            />
            Hide header
          </label>
        )}

        {!headerHidden && (
          <>
            {showLabel && (
              <div>
                <label htmlFor={`widget-header-label-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">
                  Widget label
                </label>
                <div className="relative">
                  <input
                    id={`widget-header-label-${widget.id}`}
                    className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 pr-8 text-theme-ink focus:border-theme-accent focus:outline-none"
                    value={label || ''}
                    onChange={(event) => updateData({ label: event.target.value })}
                    placeholder="Widget label"
                  />
                  {label && (
                    <Tooltip content="Clear label">
                      <button
                        type="button"
                        onClick={() => updateData({ label: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted transition-colors hover:text-theme-ink"
                        aria-label="Clear label"
                      >
                        ×
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
              <input
                type="checkbox"
                checked={hideWidgetEditButton}
                onChange={(event) => updateData({ hideWidgetEditButton: event.target.checked })}
                className="h-4 w-4 accent-theme-accent"
              />
              Hide edit button
            </label>

            {hasHeaderControls && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
                <input
                  type="checkbox"
                  checked={widget.data.showFieldControls === false}
                  onChange={(event) => updateData({ showFieldControls: !event.target.checked })}
                  className="h-4 w-4 accent-theme-accent"
                />
                {isSpellSlot ? 'Hide + button' : 'Hide +/− controls'}
              </label>
            )}

            {isTable && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
                <input
                  type="checkbox"
                  checked={widget.data.showTableEditButton === false}
                  onChange={(event) => updateData({ showTableEditButton: !event.target.checked })}
                  className="h-4 w-4 accent-theme-accent"
                />
                Hide Edit Table button
              </label>
            )}

            {isCardDeck && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
                <input
                  type="checkbox"
                  checked={widget.data.showCardCount === false || widget.data.hideCardCount === true}
                  onChange={(event) => updateData({
                    showCardCount: !event.target.checked,
                    hideCardCount: undefined,
                  })}
                  className="h-4 w-4 accent-theme-accent"
                />
                Hide card count
              </label>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
