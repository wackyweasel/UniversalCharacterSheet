interface AddMultipleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AddMultipleToggle({ checked, onChange }: AddMultipleToggleProps) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-theme-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-theme-accent"
      />
      Add multiple items
    </label>
  );
}

interface SelectionActionsProps {
  onCheckAll: () => void;
  onUncheckAll: () => void;
  checkAllDisabled?: boolean;
}

export function SelectionActions({ onCheckAll, onUncheckAll, checkAllDisabled = false }: SelectionActionsProps) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onCheckAll}
        disabled={checkAllDisabled}
        className="widget-control px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        Check all
      </button>
      <button
        type="button"
        onClick={onUncheckAll}
        className="widget-control px-2 py-1 text-xs"
      >
        Uncheck all
      </button>
    </div>
  );
}