import type { EditorProps } from './types';

export function DiceResultOverlayOption({ widget, updateData }: EditorProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={widget.data.diceResultOverlay ?? false}
        onChange={(event) => updateData({ diceResultOverlay: event.target.checked })}
        className="h-4 w-4 accent-theme-accent"
      />
      <span className="text-sm text-theme-ink">Show results in an overlay on the widget</span>
    </label>
  );
}
